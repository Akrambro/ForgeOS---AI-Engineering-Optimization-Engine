import { RLStateSpace, RLActionSpace, RLStepResult, RLEnvironmentType } from '../../types';
import { SeededRandom } from '../math/random';

/**
 * Base abstract class for Reinforcement Learning environments
 */
export abstract class RLEnvironment {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly type: RLEnvironmentType;
  public abstract readonly stateSpace: RLStateSpace;
  public abstract readonly actionSpace: RLActionSpace;

  protected rng: SeededRandom;
  protected currentStep: number = 0;
  protected maxSteps: number = 100;
  protected currentState: number[] = [];

  constructor(seed: number = 42, maxSteps: number = 100) {
    this.rng = new SeededRandom(seed);
    this.maxSteps = maxSteps;
  }

  public abstract reset(seed?: number): number[];
  public abstract step(action: number | number[]): RLStepResult;

  public getState(): number[] {
    return [...this.currentState];
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getMaxSteps(): number {
    return this.maxSteps;
  }
}

/**
 * 1. EV Thermal Dynamic Control Environment
 * Models battery pack temperature under dynamic drive-cycle power demands (WLTP/US06 pulses).
 * Goal: Maintain T_battery within [25°C, 38°C] while minimizing parasitic coolant pump and radiator fan energy.
 */
export class EVThermalDynamicEnvironment extends RLEnvironment {
  public readonly id = 'ev_thermal_dynamic_v1';
  public readonly name = 'EV Battery Pack Active Thermal Management';
  public readonly type: RLEnvironmentType = 'ev_thermal_dynamic';

  public readonly stateSpace: RLStateSpace = {
    dim: 5,
    labels: [
      'T_battery (°C)',
      'T_coolant (°C)',
      'Ambient Temp (°C)',
      'Heat Generation Rate (kW)',
      'Coolant Flow Rate (L/min)',
    ],
    bounds: {
      lower: [10, 10, -10, 0, 0],
      upper: [70, 60, 45, 20, 60],
    },
  };

  public readonly actionSpace: RLActionSpace = {
    type: 'discrete',
    dim: 1,
    labels: ['Coolant Mode (0: Off, 1: Low 15 L/min, 2: Med 30 L/min, 3: High 50 L/min, 4: Boost 60 L/min)'],
    discreteCount: 5,
    bounds: { lower: [0], upper: [4] },
  };

  // Thermal physical constants (2-Node Core-Case-Coolant Network)
  private readonly m_core = 380; // kg (active cell jelly-roll core)
  private readonly Cp_core = 900; // J/(kg*K)
  private readonly m_case = 70; // kg (casing, busbars and cooling plate)
  private readonly Cp_case = 850; // J/(kg*K)
  private readonly m_coolant = 25; // kg
  private readonly Cp_coolant = 3800; // J/(kg*K)
  private readonly R_int = 0.008; // K/W (Internal conductive thermal resistance from cell core to casing)
  private readonly T_target = 32.0; // °C
  private readonly T_critical = 45.0; // °C
  private readonly dt = 1.0; // 1 second per macro step

  // Flow mapping for discrete actions (L/min)
  private readonly flowRates = [0.0, 15.0, 30.0, 50.0, 60.0];
  // Parasitic electrical pump + fan power consumption (Watts)
  private readonly parasiticPower = [0.0, 45.0, 160.0, 480.0, 850.0];

  private currentFlow: number = 0;
  private T_core: number = 28.0;
  private T_case: number = 28.0;
  private T_cool: number = 25.0;
  private T_amb: number = 28.0;

  constructor(seed: number = 42, maxSteps: number = 120) {
    super(seed, maxSteps);
    this.reset();
  }

  public reset(seed?: number): number[] {
    if (seed !== undefined) {
      this.rng = new SeededRandom(seed);
    }
    this.currentStep = 0;
    this.T_amb = 25.0 + this.rng.uniform(-3, 5);
    this.T_core = 28.0 + this.rng.uniform(-2, 3);
    this.T_case = this.T_core - 0.5;
    this.T_cool = this.T_amb;
    this.currentFlow = 0;

    const qGen = this.getDriveCycleHeatGen(0);
    this.currentState = [this.T_core, this.T_cool, this.T_amb, qGen, this.currentFlow];
    return this.getState();
  }

  /**
   * Evaluates thermal derivatives for the 2-node battery system:
   * Returns [dT_core/dt, dT_case/dt, dT_cool/dt]
   */
  private computeThermalDerivatives(
    T_core: number,
    T_case: number,
    T_cool: number,
    qGen_W: number,
    flowLpm: number
  ): [number, number, number] {
    // 1. Conduction from Core to Case: Q_cond = (T_core - T_case) / R_int
    const Q_cond = (T_core - T_case) / this.R_int;

    // 2. Convective heat transfer from Case to Coolant (Dittus-Boelter scaling)
    const hA = flowLpm > 0 ? 95.0 * Math.pow(flowLpm / 20.0, 0.8) : 6.0;
    const Q_conv = hA * (T_case - T_cool);

    // 3. Heat dissipated to ambient via radiator
    const hA_rad = flowLpm > 0 ? 130.0 * Math.pow(flowLpm / 30.0, 0.7) : 10.0;
    const Q_rad = hA_rad * (T_cool - this.T_amb);

    const dT_core = (qGen_W - Q_cond) / (this.m_core * this.Cp_core);
    const dT_case = (Q_cond - Q_conv) / (this.m_case * this.Cp_case);
    const dT_cool = (Q_conv - Q_rad) / (this.m_coolant * this.Cp_coolant);

    return [dT_core, dT_case, dT_cool];
  }

  public step(action: number | number[]): RLStepResult {
    this.currentStep++;

    // Parse action
    const actIdx = Math.max(0, Math.min(4, typeof action === 'number' ? Math.floor(action) : Math.floor(action[0])));
    this.currentFlow = this.flowRates[actIdx];
    const powerW = this.parasiticPower[actIdx];

    // Heat generation from drive cycle (acceleration bursts)
    const qGen_kW = this.getDriveCycleHeatGen(this.currentStep);
    const qGen_W = qGen_kW * 1000.0;

    // 4th-Order Runge-Kutta (RK4) Numerical Integration
    const h = this.dt;
    const [k1_core, k1_case, k1_cool] = this.computeThermalDerivatives(
      this.T_core, this.T_case, this.T_cool, qGen_W, this.currentFlow
    );

    const [k2_core, k2_case, k2_cool] = this.computeThermalDerivatives(
      this.T_core + 0.5 * h * k1_core,
      this.T_case + 0.5 * h * k1_case,
      this.T_cool + 0.5 * h * k1_cool,
      qGen_W, this.currentFlow
    );

    const [k3_core, k3_case, k3_cool] = this.computeThermalDerivatives(
      this.T_core + 0.5 * h * k2_core,
      this.T_case + 0.5 * h * k2_case,
      this.T_cool + 0.5 * h * k2_cool,
      qGen_W, this.currentFlow
    );

    const [k4_core, k4_case, k4_cool] = this.computeThermalDerivatives(
      this.T_core + h * k3_core,
      this.T_case + h * k3_case,
      this.T_cool + h * k3_cool,
      qGen_W, this.currentFlow
    );

    this.T_core += (h / 6.0) * (k1_core + 2 * k2_core + 2 * k3_core + k4_core);
    this.T_case += (h / 6.0) * (k1_case + 2 * k2_case + 2 * k3_case + k4_case);
    this.T_cool += (h / 6.0) * (k1_cool + 2 * k2_cool + 2 * k3_cool + k4_cool);

    // Multi-objective reward based on Core battery temperature
    const tempDev = Math.abs(this.T_core - this.T_target);
    const tempPenalty = -0.15 * Math.pow(tempDev, 2);

    // Safety penalty if core exceeds critical limit
    const safetyPenalty = this.T_core > this.T_critical ? -15.0 * (this.T_core - this.T_critical) : 0.0;

    // Parasitic power penalty
    const energyPenalty = -(powerW / 1000.0) * 0.4;

    // Stability reward
    const sweetSpotBonus = (this.T_core >= 28.0 && this.T_core <= 36.0) ? 1.5 : 0.0;

    const reward = Number((tempPenalty + safetyPenalty + energyPenalty + sweetSpotBonus).toFixed(4));
    const done = this.currentStep >= this.maxSteps || this.T_core > 65.0;

    const nextQGen = this.getDriveCycleHeatGen(this.currentStep);
    this.currentState = [
      Number(this.T_core.toFixed(2)),
      Number(this.T_cool.toFixed(2)),
      Number(this.T_amb.toFixed(2)),
      Number(nextQGen.toFixed(2)),
      Number(this.currentFlow.toFixed(1)),
    ];

    return {
      state: this.getState(),
      reward,
      done,
      info: {
        step: this.currentStep,
        batteryTemp: this.T_core,
        caseTemp: this.T_case,
        coolantTemp: this.T_cool,
        pumpPowerW: powerW,
        heatGenKW: qGen_kW,
        isSafe: this.T_core <= this.T_critical,
      },
    };
  }

  /**
   * Deterministic dynamic heat generation profile simulating WLTP highway acceleration cycles
   */
  private getDriveCycleHeatGen(step: number): number {
    // Base heat: 2.0 kW
    // Acceleration burst cycles every 25 seconds
    const phase = step % 30;
    if (phase >= 5 && phase <= 12) {
      // High-speed acceleration pulse
      return 12.5 + Math.sin(phase) * 1.5;
    } else if (phase >= 18 && phase <= 22) {
      // Regenerative braking pulse
      return 6.0 + Math.cos(phase);
    }
    return 1.8 + Math.sin(step * 0.1) * 0.5;
  }
}

/**
 * 2. CSTR Chemical Reactor Environment (Continuous Non-Linear Dynamics)
 * Controls cooling jacket temperature to maximize desired product conversion while preventing thermal runaway.
 */
export class CSTRChemicalReactorEnvironment extends RLEnvironment {
  public readonly id = 'cstr_chemical_reactor_v1';
  public readonly name = 'Continuous Stirred Tank Reactor (CSTR) Dynamic Controller';
  public readonly type: RLEnvironmentType = 'cstr_chemical_reactor';

  public readonly stateSpace: RLStateSpace = {
    dim: 3,
    labels: ['Reactant Concentration C_A (mol/m³)', 'Reactor Temp T_R (K)', 'Cooling Jacket Temp T_c (K)'],
    bounds: {
      lower: [0.0, 280.0, 270.0],
      upper: [1000.0, 450.0, 400.0],
    },
  };

  public readonly actionSpace: RLActionSpace = {
    type: 'continuous',
    dim: 1,
    labels: ['Cooling Jacket Temp Adjustment ΔT_c (K)'],
    bounds: { lower: [-5.0], upper: [5.0] },
  };

  // CSTR Parameters
  private C_A = 800.0; // mol/m3
  private T_R = 340.0; // K
  private T_c = 300.0; // K

  private readonly q = 100.0; // m3/min
  private readonly V = 100.0; // m3
  private readonly C_Af = 1000.0; // Feed conc
  private readonly T_f = 350.0; // Feed temp
  private readonly k0 = 7.2e10; // Reaction rate constant (1/min)
  private readonly E_over_R = 8750.0; // Activation energy
  private readonly deltaH = -5.0e4; // J/mol (exothermic)
  private readonly rhoCp = 500.0; // J/(m3*K)
  private readonly UA = 5.0e4; // W/K

  constructor(seed: number = 42, maxSteps: number = 80) {
    super(seed, maxSteps);
    this.reset();
  }

  public reset(seed?: number): number[] {
    if (seed !== undefined) {
      this.rng = new SeededRandom(seed);
    }
    this.currentStep = 0;
    this.C_A = 800.0 + this.rng.uniform(-20, 20);
    this.T_R = 338.0 + this.rng.uniform(-3, 3);
    this.T_c = 300.0;
    this.currentState = [this.C_A, this.T_R, this.T_c];
    return this.getState();
  }

  public step(action: number | number[]): RLStepResult {
    this.currentStep++;
    const deltaTc = typeof action === 'number' ? action : action[0];
    const clampedDeltaTc = Math.max(-5.0, Math.min(5.0, deltaTc));

    this.T_c = Math.max(270.0, Math.min(380.0, this.T_c + clampedDeltaTc));

    // Arrhenius rate law and coupled ODE derivatives
    const computeDerivatives = (ca: number, tr: number, tc: number): [number, number] => {
      const safeTR = Math.max(200.0, tr);
      const k = this.k0 * Math.exp(-this.E_over_R / safeTR);
      const dca = (this.q / this.V) * (this.C_Af - ca) - k * ca;
      const dtr = (
        (this.q / this.V) * (this.T_f - tr) -
        (this.deltaH / this.rhoCp) * k * ca -
        (this.UA / (this.V * this.rhoCp)) * (tr - tc)
      );
      return [dca, dtr];
    };

    // 4th-Order Runge-Kutta (RK4) with 4 micro-substeps to stably integrate stiff Arrhenius kinetics
    const totalDt = 0.05; // min
    const substeps = 4;
    const h = totalDt / substeps;

    for (let s = 0; s < substeps; s++) {
      const [k1_ca, k1_tr] = computeDerivatives(this.C_A, this.T_R, this.T_c);

      const [k2_ca, k2_tr] = computeDerivatives(
        Math.max(0.0, this.C_A + 0.5 * h * k1_ca),
        this.T_R + 0.5 * h * k1_tr,
        this.T_c
      );

      const [k3_ca, k3_tr] = computeDerivatives(
        Math.max(0.0, this.C_A + 0.5 * h * k2_ca),
        this.T_R + 0.5 * h * k2_tr,
        this.T_c
      );

      const [k4_ca, k4_tr] = computeDerivatives(
        Math.max(0.0, this.C_A + h * k3_ca),
        this.T_R + h * k3_tr,
        this.T_c
      );

      this.C_A = Math.max(0.0, Math.min(this.C_Af, this.C_A + (h / 6.0) * (k1_ca + 2 * k2_ca + 2 * k3_ca + k4_ca)));
      this.T_R = Math.max(250.0, this.T_R + (h / 6.0) * (k1_tr + 2 * k2_tr + 2 * k3_tr + k4_tr));
    }

    // Conversion rate: X = (C_Af - C_A) / C_Af
    const conversion = (this.C_Af - this.C_A) / this.C_Af;

    // Reward: High conversion + penalty for thermal runaway (> 380 K)
    const conversionReward = conversion * 10.0;
    const tempRunawayPenalty = this.T_R > 375.0 ? -Math.pow(this.T_R - 375.0, 2) * 0.5 : 0.0;
    const controlEffortPenalty = -Math.abs(clampedDeltaTc) * 0.05;

    const reward = Number((conversionReward + tempRunawayPenalty + controlEffortPenalty).toFixed(4));
    const done = this.currentStep >= this.maxSteps || this.T_R > 420.0;

    this.currentState = [
      Number(this.C_A.toFixed(2)),
      Number(this.T_R.toFixed(2)),
      Number(this.T_c.toFixed(2)),
    ];

    return {
      state: this.getState(),
      reward,
      done,
      info: {
        step: this.currentStep,
        conversion,
        reactorTemp: this.T_R,
        coolingTemp: this.T_c,
      },
    };
  }
}

/**
 * 3. Continuous Inverted Pendulum Actuator (Classic Control Benchmark)
 */
export class InvertedPendulumEnvironment extends RLEnvironment {
  public readonly id = 'inverted_pendulum_v1';
  public readonly name = 'Inverted Pendulum Dynamic Balancing Actuator';
  public readonly type: RLEnvironmentType = 'inverted_pendulum_actuator';

  public readonly stateSpace: RLStateSpace = {
    dim: 3,
    labels: ['cos(θ)', 'sin(θ)', 'Angular Velocity θ_dot (rad/s)'],
    bounds: {
      lower: [-1.0, -1.0, -8.0],
      upper: [1.0, 1.0, 8.0],
    },
  };

  public readonly actionSpace: RLActionSpace = {
    type: 'continuous',
    dim: 1,
    labels: ['Motor Torque u (N·m)'],
    bounds: { lower: [-2.0], upper: [2.0] },
  };

  private theta = Math.PI; // radians (0 = upright)
  private thetaDot = 0.0;
  private readonly maxSpeed = 8.0;
  private readonly maxTorque = 2.0;
  private readonly dt = 0.05;
  private readonly g = 9.81;
  private readonly m = 1.0;
  private readonly l = 1.0;

  constructor(seed: number = 42, maxSteps: number = 100) {
    super(seed, maxSteps);
    this.reset();
  }

  public reset(seed?: number): number[] {
    if (seed !== undefined) {
      this.rng = new SeededRandom(seed);
    }
    this.currentStep = 0;
    this.theta = Math.PI + this.rng.uniform(-0.1, 0.1);
    this.thetaDot = this.rng.uniform(-0.5, 0.5);

    this.currentState = [Math.cos(this.theta), Math.sin(this.theta), this.thetaDot];
    return this.getState();
  }

  /**
   * Continuous Hamiltonian angular acceleration ODE:
   * d^2(theta)/dt^2 = -(3g / 2l) * sin(theta + pi) + (3 / (m * l^2)) * u
   */
  private computeAngularAcceleration(th: number, u: number): number {
    return (-3 * this.g) / (2 * this.l) * Math.sin(th + Math.PI) + (3 / (this.m * this.l * this.l)) * u;
  }

  public step(action: number | number[]): RLStepResult {
    this.currentStep++;
    let u = typeof action === 'number' ? action : action[0];
    u = Math.max(-this.maxTorque, Math.min(this.maxTorque, u));

    // Normalize angle to [-PI, PI]
    const normAngle = ((this.theta + Math.PI) % (2 * Math.PI)) - Math.PI;

    // Costs: theta^2 + 0.1*theta_dot^2 + 0.001*u^2
    const costs = Math.pow(normAngle, 2) + 0.1 * Math.pow(this.thetaDot, 2) + 0.001 * Math.pow(u, 2);
    const reward = -costs;

    // 4th-Order Runge-Kutta (RK4) for mechanical energy & phase-space conservation
    const h = this.dt;
    const k1_v = this.computeAngularAcceleration(this.theta, u);
    const k1_x = this.thetaDot;

    const k2_v = this.computeAngularAcceleration(this.theta + 0.5 * h * k1_x, u);
    const k2_x = this.thetaDot + 0.5 * h * k1_v;

    const k3_v = this.computeAngularAcceleration(this.theta + 0.5 * h * k2_x, u);
    const k3_x = this.thetaDot + 0.5 * h * k2_v;

    const k4_v = this.computeAngularAcceleration(this.theta + h * k3_x, u);
    const k4_x = this.thetaDot + h * k3_v;

    const newTheta = this.theta + (h / 6.0) * (k1_x + 2 * k2_x + 2 * k3_x + k4_x);
    const newThetaDot = this.thetaDot + (h / 6.0) * (k1_v + 2 * k2_v + 2 * k3_v + k4_v);

    this.theta = newTheta;
    this.thetaDot = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, newThetaDot));

    const done = this.currentStep >= this.maxSteps;

    this.currentState = [
      Number(Math.cos(this.theta).toFixed(4)),
      Number(Math.sin(this.theta).toFixed(4)),
      Number(this.thetaDot.toFixed(4)),
    ];

    return {
      state: this.getState(),
      reward: Number(reward.toFixed(4)),
      done,
      info: {
        step: this.currentStep,
        angleRad: normAngle,
        angleDeg: (normAngle * 180) / Math.PI,
        torque: u,
      },
    };
  }
}
