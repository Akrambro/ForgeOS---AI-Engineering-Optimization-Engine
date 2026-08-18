/**
 * Synthetic EV Thermal Optimization Benchmark Model
 * 
 * Physically-inspired mathematical demonstration for battery pack & powertrain cooling.
 * 
 * Assumptions & Physics Formulation:
 * 1. Heat Generation (Q_in): 14.5 kW peak thermal load under fast charging / highway cruising.
 * 2. Ambient Condition: T_amb = 35.0 °C.
 * 3. Heat Rejection (Q_out): Convective + forced conduction:
 *    - Airflow across radiator governed by fan speed and frontal duct ram-air velocity.
 *    - Coolant loop convection governed by turbulent pipe flow Nusselt correlation.
 * 4. Steady-state Peak Battery/Inverter Temperature:
 *    T_peak = T_amb + (Q_in / (U * Area_eff * Eff_hx + m_dot_coolant * Cp_coolant + 1e-4))
 * 5. Parasitic Electrical Consumption:
 *    P_electrical = P_pump(flow, delta_p) + P_fan(fan_speed, duct_area)
 * 6. System Mass:
 *    Mass = M_radiator(area) + M_coolant(radiator_vol + loop) + M_pump + M_fan + M_duct
 * 7. Pressure Drop:
 *    Delta_P = K_flow * (coolant_flow / 60)^1.85 / (Area_radiator^0.8 + 0.1)
 */

export interface EvThermalInput {
  radiator_area: number; // m^2 [0.15, 0.65]
  coolant_flow: number;  // L/min [8.0, 45.0]
  pump_speed: number;    // RPM [1200, 4500]
  fan_speed: number;     // RPM [600, 3200]
  duct_area: number;     // m^2 [0.04, 0.25]
  heat_exchanger_efficiency: number; // [0.65, 0.98]
}

export interface EvThermalOutput {
  objectives: {
    peak_temperature: number;   // °C (minimize)
    energy_consumption: number; // Watts (minimize)
    system_mass: number;        // kg (minimize)
  };
  constraints: {
    max_temperature_margin: number; // T_peak <= 65°C -> value is T_peak
    max_pressure_drop: number;      // Delta_P <= 45 kPa -> value is Delta_P
    pump_speed_limit: number;       // pump_speed <= 4500 RPM
  };
  diagnostics: {
    heat_rejected_kW: number;
    pump_power_W: number;
    fan_power_W: number;
    radiator_mass_kg: number;
    coolant_mass_kg: number;
    pressure_drop_kPa: number;
  };
}

export function evaluateEvThermal(params: Record<string, number | string>): EvThermalOutput {
  const radArea = Number(params.radiator_area ?? 0.35);
  const flow = Number(params.coolant_flow ?? 25.0);
  const pumpRpm = Number(params.pump_speed ?? 2800);
  const fanRpm = Number(params.fan_speed ?? 1800);
  const ductArea = Number(params.duct_area ?? 0.12);
  const hxEff = Number(params.heat_exchanger_efficiency ?? 0.85);

  const T_amb = 35.0; // °C
  const Q_gen_kW = 14.5; // kW thermal generation

  // 1. Coolant & Air dynamics
  const flow_m3s = flow / 60000; // m^3/s
  const air_speed_duct = (0.00015 * fanRpm + 12.0 * Math.sqrt(ductArea)); // m/s
  const air_mass_flow = 1.204 * air_speed_duct * ductArea; // kg/s

  // Thermal conductances
  const h_air = 45.0 * Math.pow(Math.max(air_speed_duct, 0.5), 0.72);
  const h_coolant = 120.0 * Math.pow(Math.max(flow, 1.0), 0.80);
  const U_overall = (1.0 / (1.0 / (h_air + 1e-3) + 1.0 / (h_coolant + 1e-3))) * 1.8;

  const effective_UA = U_overall * radArea * hxEff * 0.42; // kW/K
  const coolant_cap = (flow / 60.0) * 3.85; // kW/K (water-glycol 50/50)

  // Steady-state battery & coolant temperature delta
  const delta_T_rad = Q_gen_kW / (effective_UA + 0.12 * air_mass_flow * 1.005 + 1e-3);
  const delta_T_coldplate = Q_gen_kW / (coolant_cap + 0.05);
  const peak_temperature = T_amb + delta_T_rad + delta_T_coldplate * 0.38;

  // 2. Fluid Pressure Drop (Darcy-Weisbach empirical proxy)
  const pressure_drop_kPa = 3.2 + 0.048 * Math.pow(flow, 1.78) / (Math.pow(radArea, 0.6) + 0.08);

  // 3. Electrical Parasitics (Pump + Fan)
  const pump_hyd_power = (flow_m3s * pressure_drop_kPa * 1000) / 0.52; // W
  const pump_elec_base = 15.0 + 0.000018 * Math.pow(pumpRpm, 1.95);
  const pump_power_W = Math.max(pump_hyd_power + pump_elec_base, 10.0);

  const fan_power_W = 12.0 + 0.000000085 * Math.pow(fanRpm, 2.82) * (ductArea / 0.1);
  const energy_consumption = pump_power_W + fan_power_W;

  // 4. System Mass Calculation
  const rad_core_mass = radArea * 14.5; // aluminum core
  const coolant_mass = (radArea * 0.018 + 0.004 * (flow / 15)) * 1050; // kg
  const pump_mass = 1.8 + (pumpRpm / 4500) * 1.2;
  const fan_mass = 2.2 + (fanRpm / 3200) * 1.5;
  const duct_mass = ductArea * 8.5;
  const system_mass = rad_core_mass + coolant_mass + pump_mass + fan_mass + duct_mass + (hxEff - 0.65) * 4.0;

  const heat_rejected_kW = Math.min(Q_gen_kW, (peak_temperature - T_amb) * effective_UA * 1.2);

  return {
    objectives: {
      peak_temperature: Number(peak_temperature.toFixed(2)),
      energy_consumption: Number(energy_consumption.toFixed(2)),
      system_mass: Number(system_mass.toFixed(2)),
    },
    constraints: {
      max_temperature_margin: Number(peak_temperature.toFixed(2)),
      max_pressure_drop: Number(pressure_drop_kPa.toFixed(2)),
      pump_speed_limit: Number(pumpRpm.toFixed(0)),
    },
    diagnostics: {
      heat_rejected_kW: Number(heat_rejected_kW.toFixed(2)),
      pump_power_W: Number(pump_power_W.toFixed(1)),
      fan_power_W: Number(fan_power_W.toFixed(1)),
      radiator_mass_kg: Number(rad_core_mass.toFixed(2)),
      coolant_mass_kg: Number(coolant_mass.toFixed(2)),
      pressure_drop_kPa: Number(pressure_drop_kPa.toFixed(2)),
    },
  };
}
