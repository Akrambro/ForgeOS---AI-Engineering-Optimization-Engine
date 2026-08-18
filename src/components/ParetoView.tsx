import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  Legend
} from 'recharts';
import { 
  GitFork, 
  Layers, 
  CheckCircle2, 
  Award, 
  Info, 
  Sliders, 
  Compass, 
  Sparkles,
  TrendingDown,
  Target,
  SlidersHorizontal
} from 'lucide-react';
import { OptimizationRun, Problem, Trial } from '../types';
import { MultiObjectiveEngine, ParetoPoint, MCDMWeightConfig } from '../core/multi_objective/multiObjectiveEngine';

interface ParetoViewProps {
  runs: OptimizationRun[];
  problems: Problem[];
}

export const ParetoView: React.FC<ParetoViewProps> = ({ runs, problems }) => {
  // Find runs with multi-objective problems
  const multiObjRuns = runs.filter(r => {
    const prob = problems.find(p => p.id === r.problemId);
    return prob && prob.objectives.length >= 2;
  });

  const [selectedRunId, setSelectedRunId] = useState<string>(multiObjRuns[0]?.id || runs[0]?.id || '');
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);

  // Phase 5 MCDM & Decision Support States
  const [weightObj1, setWeightObj1] = useState<number>(0.5);
  const [weightObj2, setWeightObj2] = useState<number>(0.5);
  const [decisionMode, setDecisionMode] = useState<'all' | 'topsis' | 'knee'>('all');

  const selectedRun = runs.find(r => r.id === selectedRunId);
  const selectedProblem = selectedRun ? problems.find(p => p.id === selectedRun.problemId) : null;

  const obj1 = selectedProblem?.objectives[0];
  const obj2 = selectedProblem?.objectives[1];

  let allTrials = selectedRun?.trials.filter(t => t.status === 'successful' && t.feasible) || [];
  let paretoFront: Trial[] = [];
  let hypervolume: number = 0;
  let kneeTrial: Trial | null = null;
  let topsisBestTrial: Trial | null = null;
  let topsisScore: number = 0;

  if (selectedProblem && allTrials.length > 0 && selectedProblem.objectives.length >= 2) {
    const engine = new MultiObjectiveEngine(selectedProblem);
    const pop: ParetoPoint[] = allTrials.map(t => ({
      id: t.id,
      parameters: t.parameters,
      objectiveValues: t.objectiveValues,
      constraintValues: t.constraintValues,
      feasible: t.feasible,
    }));

    const frontPoints = engine.extractParetoFront(pop);
    paretoFront = allTrials.filter(t => frontPoints.some(fp => fp.id === t.id));

    // Calculate Hypervolume with dynamic 20% outer reference point
    if (paretoFront.length > 0 && obj1 && obj2) {
      const maxO1 = Math.max(...allTrials.map(t => t.objectiveValues[obj1.name] ?? 1.0));
      const maxO2 = Math.max(...allTrials.map(t => t.objectiveValues[obj2.name] ?? 1.0));
      hypervolume = engine.calculateHypervolume2D(frontPoints, [maxO1 * 1.2, maxO2 * 1.2]);

      // Knee point detection
      const kneePt = engine.findKneePoint(frontPoints);
      if (kneePt) {
        kneeTrial = allTrials.find(t => t.id === kneePt.id) || null;
      }

      // TOPSIS MCDM scoring
      const mcdmConfig: MCDMWeightConfig = {
        weights: {
          [obj1.name]: weightObj1,
          [obj2.name]: weightObj2,
        },
      };
      const mcdmRes = engine.rankSolutionsTOPSIS(frontPoints, mcdmConfig);
      if (mcdmRes && mcdmRes.selectedPoint) {
        topsisBestTrial = allTrials.find(t => t.id === mcdmRes.selectedPoint.id) || null;
        topsisScore = mcdmRes.score;
      }
    }
  }

  // Scatter chart data mapping
  const chartData = allTrials.map(t => {
    const isPareto = paretoFront.some(p => p.id === t.id);
    const isKnee = kneeTrial?.id === t.id;
    const isTopsis = topsisBestTrial?.id === t.id;
    return {
      id: t.id,
      x: Number(t.objectiveValues[obj1?.name || ''] ?? 0),
      y: Number(t.objectiveValues[obj2?.name || ''] ?? 0),
      isPareto,
      isKnee,
      isTopsis,
      trial: t,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#081117] border border-[#49e6ff]/30 rounded p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-[#62f6b4] mb-1">
              <GitFork className="w-4 h-4 text-[#62f6b4]" />
              <span className="font-bold tracking-wider uppercase">MULTI-OBJECTIVE PARETO FRONTIER MATRIX</span>
            </div>
            <h1 className="text-xl font-bold font-mono text-white tracking-tight uppercase">PARETO OPTIMALITY & MCDM DECISION SUPPORT</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Non-dominated sorting ($O(MN^2)$), crowding distance, Hypervolume (HV), knee point curvature detection, and TOPSIS preference weighting.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedRunId}
              onChange={e => {
                setSelectedRunId(e.target.value);
                setSelectedTrial(null);
              }}
              className="bg-[#05090d] border border-[#49e6ff]/30 rounded px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#49e6ff]"
            >
              {runs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.problemName} ({r.algorithm.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Phase 5 Engineering Metrics Banner */}
        {selectedProblem && selectedProblem.objectives.length >= 2 && paretoFront.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#49e6ff]/15 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#05090d] p-3 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">PARETO SET (RANK 1)</div>
              <div className="text-base font-bold text-[#ffb84d] mt-0.5">
                {paretoFront.length} / {allTrials.length} Solutions
              </div>
            </div>

            <div className="bg-[#05090d] p-3 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">HYPERVOLUME (HV)</div>
              <div className="text-base font-bold text-[#49e6ff] mt-0.5">
                {hypervolume.toFixed(3)}
              </div>
            </div>

            <div className="bg-[#05090d] p-3 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">KNEE COMPROMISE</div>
              <div className="text-base font-bold text-[#62f6b4] mt-0.5">
                {kneeTrial ? `#${kneeTrial.iteration}` : 'N/A'}
              </div>
            </div>

            <div className="bg-[#05090d] p-3 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">TOPSIS BEST FIT</div>
              <div className="text-base font-bold text-[#a97bff] mt-0.5">
                {topsisBestTrial ? `#${topsisBestTrial.iteration} (${(topsisScore * 100).toFixed(0)}%)` : 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedProblem || selectedProblem.objectives.length < 2 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3">
          <Info className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">Single Objective Problem Selected</h3>
          <p className="text-xs max-w-md mx-auto">
            Pareto front trade-off analysis requires at least two simultaneous objectives (e.g. ZDT1 Bi-Objective benchmark or EV Thermal Co-Optimization).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: 2D Pareto Front Scatter & MCDM Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>2D Non-Dominated Objective Trade-Off Curve</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {paretoFront.length} non-dominated compromises with highlighted Knee and TOPSIS recommended designs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500 inline-block ring-2 ring-purple-300"></span>
                    <span className="text-purple-300 font-semibold">TOPSIS Winner</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block ring-2 ring-emerald-300"></span>
                    <span className="text-emerald-300 font-semibold">Knee Point</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                    <span className="text-amber-300">Pareto (Rank 1)</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full bg-slate-950/40 rounded-lg p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name={obj1?.name || 'Obj 1'} 
                      stroke="#64748b" 
                      fontSize={11}
                      label={{ value: `${obj1?.name} (${obj1?.unit || 'unit'})`, position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name={obj2?.name || 'Obj 2'} 
                      stroke="#64748b" 
                      fontSize={11}
                      label={{ value: `${obj2?.name} (${obj2?.unit || 'unit'})`, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono space-y-1 shadow-lg">
                            <div className={`font-bold ${pt.isTopsis ? 'text-purple-400' : pt.isKnee ? 'text-emerald-400' : pt.isPareto ? 'text-amber-400' : 'text-slate-300'}`}>
                              {pt.isTopsis ? '★ TOPSIS Recommended Design' : pt.isKnee ? '◆ Knee Compromise Design' : pt.isPareto ? '● Pareto Optimal' : 'Feasible Candidate'} (#{pt.trial.iteration})
                            </div>
                            <div>{obj1?.name}: {pt.x} {obj1?.unit}</div>
                            <div>{obj2?.name}: {pt.y} {obj2?.unit}</div>
                            <div className="text-[10px] text-slate-500 pt-1">Click dot to inspect design parameters</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Trade-off Points"
                      data={chartData}
                      onClick={(data) => setSelectedTrial(data.trial)}
                      cursor="pointer"
                    >
                      {chartData.map((entry, index) => {
                        let fill = entry.isPareto ? '#fbbf24' : '#475569';
                        let stroke = entry.isPareto ? '#78350f' : '#1e293b';
                        let radius = entry.isPareto ? 5.5 : 3.5;

                        if (entry.isTopsis) {
                          fill = '#a855f7';
                          stroke = '#f3e8ff';
                          radius = 8;
                        } else if (entry.isKnee) {
                          fill = '#10b981';
                          stroke = '#d1fae5';
                          radius = 7;
                        }

                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={fill}
                            r={radius}
                            stroke={stroke}
                            strokeWidth={entry.isTopsis || entry.isKnee ? 2 : 1}
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TOPSIS Interactive Preference Weighting Slider */}
            {obj1 && obj2 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center space-x-2">
                    <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                    <span>MCDM Preference Weighting (TOPSIS Decision Tuning)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-purple-300">
                    Weight Ratio: {(weightObj1 * 100).toFixed(0)}% / {(weightObj2 * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                      <span>{obj1.name} Priority: {(weightObj1 * 100).toFixed(0)}%</span>
                      <span>{obj2.name} Priority: {(weightObj2 * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.95"
                      step="0.05"
                      value={weightObj1}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setWeightObj1(val);
                        setWeightObj2(Number((1.0 - val).toFixed(2)));
                      }}
                      className="w-full accent-purple-500 bg-slate-950 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-purple-400 font-bold">TOPSIS Selection: </span>
                      <span className="text-slate-200">Trial #{topsisBestTrial?.iteration || 'N/A'}</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-emerald-400 font-bold">Knee Selection: </span>
                      <span className="text-slate-200">Trial #{kneeTrial?.iteration || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Selected Solution Parameter Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Inspected Pareto Candidate</span>
            </h2>

            {selectedTrial ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-amber-400">Trial #{selectedTrial.iteration}</span>
                    <div className="flex items-center space-x-1.5">
                      {selectedTrial.id === topsisBestTrial?.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          TOPSIS #1
                        </span>
                      )}
                      {selectedTrial.id === kneeTrial?.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          KNEE
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
                        RANK 1
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    {Object.entries(selectedTrial.objectiveValues).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-slate-100 font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">Design Variable Settings:</div>
                  <div className="space-y-1.5">
                    {Object.entries(selectedTrial.parameters).map(([k, v]) => {
                      const vObj = selectedProblem.variables.find(p => p.name === k);
                      return (
                        <div key={k} className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
                          <span className="text-slate-300">{k}</span>
                          <span className="text-cyan-300 font-bold">{v} {vObj?.unit || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Click any yellow, green or purple dot on the Pareto plot to inspect its design parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pareto Solutions Table */}
      {paretoFront.length > 0 && selectedProblem && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Pareto-Optimal Set ({paretoFront.length} Solutions)</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                  <th className="py-2.5 px-3">Trial</th>
                  <th className="py-2.5 px-3">Classification</th>
                  {selectedProblem.objectives.map(o => (
                    <th key={o.id} className="py-2.5 px-3">{o.name} ({o.unit || 'unit'})</th>
                  ))}
                  <th className="py-2.5 px-3">Design Parameters</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paretoFront.map(t => {
                  const isKnee = kneeTrial?.id === t.id;
                  const isTopsis = topsisBestTrial?.id === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-amber-400 font-bold">#{t.iteration}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1">
                          {isTopsis && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                              TOPSIS #1
                            </span>
                          )}
                          {isKnee && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              Knee Point
                            </span>
                          )}
                          {!isTopsis && !isKnee && (
                            <span className="text-slate-500 text-[10px]">Non-Dominated</span>
                          )}
                        </div>
                      </td>
                      {selectedProblem.objectives.map(o => (
                        <td key={o.id} className="py-2 px-3 font-semibold text-slate-100">
                          {t.objectiveValues[o.name]}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-slate-400 truncate max-w-sm">
                        {Object.entries(t.parameters).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => setSelectedTrial(t)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
