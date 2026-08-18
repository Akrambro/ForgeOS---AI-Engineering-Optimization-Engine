/**
 * Standard Scientific Benchmark Suites A through E
 * 
 * Benchmark A: Convex quadratic functions (Sphere, Rotated Ellipsoid)
 * Benchmark B: Non-convex multimodal functions (Ackley, Rastrigin)
 * Benchmark C: Constrained engineering optimization (Welded Beam Design)
 * Benchmark D: Multi-objective functions (ZDT1, Kursawe)
 * Benchmark E: Expensive synthetic engineering function with simulated delays & multi-fidelity
 */

// Benchmark A: Sphere Function (Convex)
// f(x) = sum(x_i^2), min at x = 0, f(0) = 0
export function evaluateSphere(x: Record<string, number | string>) {
  const vals = Object.values(x).map(Number);
  const f = vals.reduce((acc, v) => acc + v * v, 0);
  return {
    objectives: { value: f },
    constraints: {},
  };
}

// Benchmark B: Ackley Function (Multimodal Non-Convex)
// f(x) = -20 exp(-0.2 sqrt(1/d sum(x_i^2))) - exp(1/d sum(cos(2pi x_i))) + 20 + e
export function evaluateAckley(x: Record<string, number | string>) {
  const vals = Object.values(x).map(Number);
  const d = vals.length || 1;
  const sum1 = vals.reduce((acc, v) => acc + v * v, 0);
  const sum2 = vals.reduce((acc, v) => acc + Math.cos(2 * Math.PI * v), 0);
  const f = -20 * Math.exp(-0.2 * Math.sqrt(sum1 / d)) - Math.exp(sum2 / d) + 20 + Math.E;
  return {
    objectives: { value: f },
    constraints: {},
  };
}

// Benchmark B2: Rastrigin Function
export function evaluateRastrigin(x: Record<string, number | string>) {
  const vals = Object.values(x).map(Number);
  const d = vals.length || 1;
  const sum = vals.reduce((acc, v) => acc + (v * v - 10 * Math.cos(2 * Math.PI * v)), 0);
  const f = 10 * d + sum;
  return {
    objectives: { value: f },
    constraints: {},
  };
}

// Benchmark C: Welded Beam Design (Classic Engineering Constrained Optimization)
// Variables: h (weld thickness), l (length of weld), t (bar height), b (bar thickness)
// Minimize cost: f(x) = 1.10471 h^2 l + 0.04811 t b (14.0 + l)
// Constraints: shear stress <= 13600, bending stress <= 30000, bucking load >= 6000, deflection <= 0.25
export function evaluateWeldedBeam(x: Record<string, number | string>) {
  const h = Number(x.h ?? 0.244);
  const l = Number(x.l ?? 6.218);
  const t = Number(x.t ?? 8.291);
  const b = Number(x.b ?? 0.244);

  const cost = 1.10471 * h * h * l + 0.04811 * t * b * (14.0 + l);

  const P = 6000;
  const L = 14.0;
  const E = 30e6;
  const G = 12e6;
  const tau_max = 13600;
  const sigma_max = 30000;
  const delta_max = 0.25;

  const M = P * (L + l / 2);
  const R = Math.sqrt(0.25 * (l * l + Math.pow(h + t, 2)));
  const J = 2 * (Math.SQRT2 * h * l * (l * l / 12 + 0.25 * Math.pow(h + t, 2)));
  const tau_prime = P / (Math.SQRT2 * h * l + 1e-6);
  const tau_double_prime = (M * R) / (J + 1e-6);
  const tau = Math.sqrt(tau_prime * tau_prime + 2 * tau_prime * tau_double_prime * (l / (2 * R + 1e-6)) + tau_double_prime * tau_double_prime);

  const sigma = (6 * P * L) / (b * t * t + 1e-6);
  const delta = (4 * P * Math.pow(L, 3)) / (E * b * Math.pow(t, 3) + 1e-6);
  const P_c = (4.013 * E * Math.sqrt((t * t * Math.pow(b, 6)) / 36) / (L * L + 1e-6)) * (1 - (t / (2 * L)) * Math.sqrt(E / (4 * G)));

  return {
    objectives: { fabrication_cost: Number(cost.toFixed(4)) },
    constraints: {
      shear_stress_limit: Number(tau.toFixed(2)),      // <= 13600 psi
      normal_stress_limit: Number(sigma.toFixed(2)),    // <= 30000 psi
      deflection_limit: Number(delta.toFixed(4)),       // <= 0.25 in
      buckling_load_limit: Number(P_c.toFixed(2)),      // >= 6000 lb
    },
  };
}

// Benchmark D: ZDT1 Multi-Objective
// f1(x) = x1, f2(x) = g(x) * (1 - sqrt(x1 / g(x)))
// g(x) = 1 + 9 / (n - 1) sum_{i=2}^n x_i
export function evaluateZdt1(x: Record<string, number | string>) {
  const x1 = Number(x.x1 ?? 0.5);
  const others = Object.entries(x)
    .filter(([k]) => k !== 'x1')
    .map(([, v]) => Number(v));
  
  const n = others.length + 1;
  const sumOthers = others.reduce((acc, v) => acc + v, 0);
  const g = 1 + (9 / Math.max(n - 1, 1)) * sumOthers;
  const f1 = x1;
  const f2 = g * (1 - Math.sqrt(Math.max(x1 / g, 0)));

  return {
    objectives: {
      f1_convergence: Number(f1.toFixed(4)),
      f2_diversity: Number(f2.toFixed(4)),
    },
    constraints: {},
  };
}

// Benchmark E: Expensive Synthetic Aerodynamic Airfoil Surrogate Simulator
export function evaluateExpensiveAero(x: Record<string, number | string>) {
  const camber = Number(x.camber ?? 0.04);
  const thickness = Number(x.thickness ?? 0.12);
  const aoa = Number(x.angle_of_attack ?? 4.0);
  const reynolds = Number(x.reynolds_scale ?? 1.0);

  // Nonlinear synthetic Navier-Stokes proxy
  const lift_coeff = 2 * Math.PI * (aoa * Math.PI / 180 + camber * 1.5) * (1 - 0.02 * Math.pow(aoa - 12, 2) * (aoa > 10 ? 1 : 0));
  const drag_coeff = 0.008 + 0.04 * thickness * thickness + 0.015 * Math.pow(lift_coeff, 2) / (Math.PI * 0.85 * reynolds);
  const lift_to_drag = lift_coeff / Math.max(drag_coeff, 1e-4);
  const structural_weight = 100 * thickness * (1 + camber);

  return {
    objectives: {
      inverse_lift_drag_ratio: Number((1 / Math.max(lift_to_drag, 0.01)).toFixed(4)), // minimize inverse L/D
      structural_weight: Number(structural_weight.toFixed(2)),
    },
    constraints: {
      min_stall_margin: Number(lift_coeff.toFixed(4)), // >= 0.85
      max_drag_coefficient: Number(drag_coeff.toFixed(4)), // <= 0.065
    },
  };
}
