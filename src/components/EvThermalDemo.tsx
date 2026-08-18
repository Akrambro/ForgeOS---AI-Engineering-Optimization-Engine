import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Play, 
  Sliders, 
  RotateCcw, 
  TrendingDown, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Wind, 
  Droplet, 
  BatteryCharging, 
  Zap, 
  Scale 
} from 'lucide-react';
import { evaluateEvThermal, EvThermalOutput } from '../core/evaluators/evThermalModel';
import { OptimizationEngine } from '../core/algorithms/engine';
import { BENCHMARK_CATALOG } from '../core/benchmarks/benchmarkSuite';
import { OptimizationRun, AlgorithmType } from '../types';

interface EvThermalDemoProps {
  onRunFinished?: (run: OptimizationRun) => void;
}

export const EvThermalDemo: React.FC<EvThermalDemoProps> = ({ onRunFinished }) => {
  const evProblem = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_ev_thermal')?.problem!;

  // Manual interactive tuning state
  const [params, setParams] = useState({
    radiator_area: 0.35,
    coolant_flow: 24.0,
    pump_speed: 2800,
    fan_speed: 1800,
    duct_area: 0.12,
    heat_exchanger_efficiency: 0.85,
  });

  const [simOutput, setSimOutput] = useState<EvThermalOutput>(evaluateEvThermal(params));

  // Live optimization benchmark comparison state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<{ alg: string; progress: number } | null>(null);
  const [optResults, setOptResults] = useState<{
    algorithm: string;
    peakTemp: number;
    powerW: number;
    massKg: number;
    evals: number;
    durationMs: number;
    feasible: boolean;
  }[]>([]);

  useEffect(() => {
    setSimOutput(evaluateEvThermal(params));
  }, [params]);

  const handleSliderChange = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Run EV thermal optimization shootout
  const handleRunShootout = async () => {
    setIsOptimizing(true);
    setOptResults([]);

    const algorithms: AlgorithmType[] = ['random_search', 'differential_evolution', 'bayesian_optimization', 'nsga_ii'];
    const results: any[] = [];

    for (const alg of algorithms) {
      setBenchmarkProgress({ alg, progress: 0 });
      const engine = new OptimizationEngine(evProblem);
      const runId = `ev_demo_${alg}_${Date.now()}`;

      const res = await engine.executeRun(
        {
          id: runId,
          algorithm: alg,
          seed: 42,
          budget: 35,
        },
        {
          onTrialComplete: (_trial, progress) => {
            setBenchmarkProgress({ alg, progress });
          },
        }
      );

      const bestParams = res.bestFeasibleSolution || {};
      const evalOut = evaluateEvThermal(bestParams);

      results.push({
        algorithm: alg === 'bayesian_optimization' ? 'Bayesian Opt (GP)' :
                   alg === 'differential_evolution' ? 'Differential Evolution' :
                   alg === 'nsga_ii' ? 'NSGA-II (Pareto Front)' : 'Random Search',
        peakTemp: evalOut.objectives.peak_temperature,
        powerW: evalOut.objectives.energy_consumption,
        massKg: evalOut.objectives.system_mass,
        evals: res.totalEvaluations,
        durationMs: res.totalDurationMs,
        feasible: evalOut.constraints.max_temperature_margin <= 65 && evalOut.constraints.max_pressure_drop <= 45,
      });
    }

    setOptResults(results);
    setIsOptimizing(false);
    setBenchmarkProgress(null);
  };

  const isTempViolated = simOutput.objectives.peak_temperature > 65.0;
  const isPressureViolated = simOutput.constraints.max_pressure_drop > 45.0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
              <Flame className="w-4 h-4" />
              <span>SYNTHETIC POWERTRAIN CASE STUDY (PRD SEC 18)</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">EV Battery Thermal Co-Optimization</h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
              Rigorous physical model coupling 14.5 kW battery/inverter heat rejection, liquid ethylene-glycol convection, ram-air duct aerodynamics, and parasitic electrical load.
            </p>
          </div>

          <button
            onClick={handleRunShootout}
            disabled={isOptimizing}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isOptimizing ? `Optimizing (${benchmarkProgress?.alg})...` : 'Run 4-Algorithm Shootout'}</span>
          </button>
        </div>
      </div>

      {/* Physics Cooling Circuit Architecture Schematic */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Thermal Circuit Live Diagnostics</span>
          </h2>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className={`px-2 py-0.5 rounded border ${!isTempViolated && !isPressureViolated ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'}`}>
              {!isTempViolated && !isPressureViolated ? '✓ All Physical Constraints Satisfied' : '⚠ Constraint Limits Exceeded'}
            </span>
          </div>
        </div>

        {/* Dynamic Schematic Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Component 1: Battery Cold Plate */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
                <span>Battery & Inverters (14.5 kW)</span>
              </span>
            </div>
            <div className="pt-2">
              <div className="text-[10px] text-slate-400 font-mono">PEAK COMPONENT TEMP</div>
              <div className={`text-2xl font-bold font-mono ${isTempViolated ? 'text-rose-400' : 'text-emerald-400'}`}>
                {simOutput.objectives.peak_temperature} °C
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Limit: ≤ 65.0 °C (Safety Margin: {(65.0 - simOutput.objectives.peak_temperature).toFixed(1)} °C)</div>
            </div>
          </div>

          {/* Component 2: Hydraulic Loop & Pump */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span>Glycol Hydraulic Loop</span>
              </span>
            </div>
            <div className="pt-2">
              <div className="text-[10px] text-slate-400 font-mono">HYDRAULIC PRESSURE DROP</div>
              <div className={`text-2xl font-bold font-mono ${isPressureViolated ? 'text-rose-400' : 'text-cyan-400'}`}>
                {simOutput.diagnostics.pressure_drop_kPa} kPa
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Pump Draw: {simOutput.diagnostics.pump_power_W} W (Flow: {params.coolant_flow} L/min)</div>
            </div>
          </div>

          {/* Component 3: Radiator Core & Airflow */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Wind className="w-4 h-4 text-amber-400" />
                <span>Radiator & Ram-Air Duct</span>
              </span>
            </div>
            <div className="pt-2">
              <div className="text-[10px] text-slate-400 font-mono">TOTAL ELECTRICAL DRAW</div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {simOutput.objectives.energy_consumption} W
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Subsystem Mass: {simOutput.objectives.system_mass} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Tuner vs Optimizer Shootout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Parameter Sliders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Interactive Design Variables</span>
            </h2>
            <button
              onClick={() => setParams({
                radiator_area: 0.35,
                coolant_flow: 24.0,
                pump_speed: 2800,
                fan_speed: 1800,
                duct_area: 0.12,
                heat_exchanger_efficiency: 0.85,
              })}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Nominal</span>
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Radiator Core Area</span>
                <span className="text-cyan-300 font-bold">{params.radiator_area} m²</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.65}
                step={0.01}
                value={params.radiator_area}
                onChange={e => handleSliderChange('radiator_area', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Coolant Flow Rate</span>
                <span className="text-cyan-300 font-bold">{params.coolant_flow} L/min</span>
              </div>
              <input
                type="range"
                min={8.0}
                max={45.0}
                step={0.5}
                value={params.coolant_flow}
                onChange={e => handleSliderChange('coolant_flow', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Pump Speed</span>
                <span className="text-cyan-300 font-bold">{params.pump_speed} RPM</span>
              </div>
              <input
                type="range"
                min={1200}
                max={4500}
                step={50}
                value={params.pump_speed}
                onChange={e => handleSliderChange('pump_speed', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Fan Speed</span>
                <span className="text-cyan-300 font-bold">{params.fan_speed} RPM</span>
              </div>
              <input
                type="range"
                min={600}
                max={3200}
                step={50}
                value={params.fan_speed}
                onChange={e => handleSliderChange('fan_speed', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Front Intake Duct Area</span>
                <span className="text-cyan-300 font-bold">{params.duct_area} m²</span>
              </div>
              <input
                type="range"
                min={0.04}
                max={0.25}
                step={0.01}
                value={params.duct_area}
                onChange={e => handleSliderChange('duct_area', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">Heat Exchanger Effectiveness</span>
                <span className="text-cyan-300 font-bold">{params.heat_exchanger_efficiency}</span>
              </div>
              <input
                type="range"
                min={0.65}
                max={0.98}
                step={0.01}
                value={params.heat_exchanger_efficiency}
                onChange={e => handleSliderChange('heat_exchanger_efficiency', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Algorithm Shootout Results Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Multi-Algorithm Co-Optimization Comparison</span>
            </h2>
          </div>

          {optResults.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-mono space-y-2">
              <div>No shootout executed yet.</div>
              <div className="text-[11px] text-slate-600">Click "Run 4-Algorithm Shootout" to compare Random Search vs DE vs Bayesian Optimization vs NSGA-II.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-2.5 px-3">Algorithm</th>
                    <th className="py-2.5 px-3">T_peak (°C)</th>
                    <th className="py-2.5 px-3">Power (W)</th>
                    <th className="py-2.5 px-3">Mass (kg)</th>
                    <th className="py-2.5 px-3">Feasible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {optResults.map((r, idx) => (
                    <tr key={r.algorithm} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{r.algorithm}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.peakTemp}°C</td>
                      <td className="py-2.5 px-3 text-amber-400">{r.powerW}W</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.massKg}kg</td>
                      <td className="py-2.5 px-3">
                        {r.feasible ? (
                          <span className="text-emerald-400">✓ Feasible</span>
                        ) : (
                          <span className="text-rose-400">✗ Violated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
