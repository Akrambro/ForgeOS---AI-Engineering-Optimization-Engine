import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ScatterChart, 
  Scatter, 
  ZAxis, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Sliders, 
  Download, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  ArrowLeft 
} from 'lucide-react';
import { OptimizationRun, Problem, Trial } from '../types';

interface RunDetailViewProps {
  run: OptimizationRun;
  problem: Problem;
  onBack: () => void;
}

export const RunDetailView: React.FC<RunDetailViewProps> = ({ run, problem, onBack }) => {
  const [filterFeasibleOnly, setFilterFeasibleOnly] = useState(false);
  const [selectedParam, setSelectedParam] = useState<string>(problem.variables[0]?.name || '');

  const primaryObj = problem.objectives[0];
  const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;

  // Prepare Convergence Chart Data
  const convergenceData = run.result?.convergenceHistory || [];

  // Prepare Parameter vs Objective Scatter Data
  const scatterData = run.trials
    .filter(t => t.status === 'successful' && (!filterFeasibleOnly || t.feasible))
    .map(t => ({
      iteration: t.iteration,
      paramVal: Number(t.parameters[selectedParam] ?? 0),
      objVal: Number(t.objectiveValues[primaryObj?.name || ''] ?? 0),
      feasible: t.feasible,
    }));

  // Constraint Violations Summary
  const constraintStats = problem.constraints.map(c => {
    let violationCount = 0;
    run.trials.forEach(t => {
      const val = t.constraintValues[c.name];
      if (val !== undefined) {
        if (c.operator === '<=' && val > c.threshold) violationCount++;
        else if (c.operator === '>=' && val < c.threshold) violationCount++;
        else if (c.operator === '==' && Math.abs(val - c.threshold) > (c.tolerance ?? 1e-3)) violationCount++;
      }
    });
    return {
      name: c.name,
      operator: c.operator,
      threshold: c.threshold,
      unit: c.unit,
      violations: violationCount,
      rate: run.trials.length > 0 ? ((violationCount / run.trials.length) * 100).toFixed(1) : '0',
    };
  });

  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(run, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `optimization_run_${run.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
                <span className="uppercase">{run.algorithm.replace('_', ' ')} RUN REPORT</span>
                <span>•</span>
                <span>Seed {run.seed}</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">{run.problemName}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={exportJson}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Run JSON</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono">OBSERVED BEST OBJECTIVE</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {run.result?.bestObjectiveValues && primaryObj
                ? `${Number(run.result.bestObjectiveValues[primaryObj.name]).toFixed(4)} ${primaryObj.unit}`
                : 'None Feasible'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{primaryObj?.name} ({primaryObj?.direction})</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono">FEASIBILITY COMPLIANCE</div>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
              {run.result ? `${run.result.feasibleEvaluations} / ${run.result.totalEvaluations}` : `${run.trials.length}`}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {run.result ? `${((run.result.feasibleEvaluations / Math.max(run.result.totalEvaluations, 1)) * 100).toFixed(1)}% feasible` : ''}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono">TERMINATION STATUS</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1 uppercase text-sm">
              {run.result?.terminationReason || run.status}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Budget of {run.budget} evaluations</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono">TOTAL DURATION</div>
            <div className="text-xl font-bold font-mono text-slate-200 mt-1">
              {run.result ? `${(run.result.totalDurationMs / 1000).toFixed(2)}s` : '-'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg {run.trials.length > 0 ? (run.result?.totalDurationMs ?? 0) / run.trials.length : 0}ms / trial
            </div>
          </div>
        </div>
      </div>

      {/* Best Feasible Solution Parameter Display */}
      {run.result?.bestFeasibleSolution && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase font-mono mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>Optimal Candidate Parameter Vector Found</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(run.result.bestFeasibleSolution).map(([k, v]) => {
              const variable = problem.variables.find(pv => pv.name === k);
              return (
                <div key={k} className="bg-slate-950/80 border border-emerald-900/40 p-3 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-mono truncate">{k}</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-0.5">{String(v)}</div>
                  <div className="text-[10px] text-emerald-400/80 font-mono">{variable?.unit || ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Section: Convergence & Parameter Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Convergence Curve */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <span>Convergence History</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Best Feasible vs Iteration</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convergenceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="iteration" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bestObjective"
                  name="Best Any Solution"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="stepAfter"
                  dataKey="feasibleBestObjective"
                  name="Best Feasible Solution"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Parameter Sensitivity Scatter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Parameter Sensitivity Scatter</span>
            </h2>

            <select
              value={selectedParam}
              onChange={e => setSelectedParam(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
            >
              {problem.variables.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" dataKey="paramVal" name={selectedParam} stroke="#64748b" fontSize={11} />
                <YAxis type="number" dataKey="objVal" name={primaryObj?.name || 'Objective'} stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
                <Scatter name="Evaluated Trials" data={scatterData} fill="#38bdf8" shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Constraint Compliance Table */}
      {problem.constraints.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Constraint Boundaries & Violation Breakdown</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                  <th className="py-2.5 px-3">Constraint</th>
                  <th className="py-2.5 px-3">Mathematical Condition</th>
                  <th className="py-2.5 px-3">Violations</th>
                  <th className="py-2.5 px-3">Violation Rate</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {constraintStats.map((cs) => (
                  <tr key={cs.name} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-medium text-slate-200">{cs.name}</td>
                    <td className="py-2 px-3 text-cyan-300">
                      {cs.operator} {cs.threshold} {cs.unit}
                    </td>
                    <td className="py-2 px-3">{cs.violations} / {run.trials.length}</td>
                    <td className="py-2 px-3">{cs.rate}%</td>
                    <td className="py-2 px-3">
                      {cs.violations === 0 ? (
                        <span className="text-emerald-400 font-bold">100% Satisfied</span>
                      ) : (
                        <span className="text-amber-400">Boundary Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trial History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Full Historical Evaluation Log ({run.trials.length} Trials)</span>
          </h2>

          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterFeasibleOnly}
              onChange={e => setFilterFeasibleOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Show Feasible Only</span>
          </label>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950 sticky top-0">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Feasibility</th>
                <th className="py-2 px-3">Objectives</th>
                <th className="py-2 px-3">Parameters</th>
                <th className="py-2 px-3">Duration</th>
                <th className="py-2 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {run.trials
                .filter(t => !filterFeasibleOnly || t.feasible)
                .map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-cyan-400 font-bold">{t.iteration}</td>
                    <td className="py-2 px-3">
                      {t.feasible ? (
                        <span className="text-emerald-400">Feasible</span>
                      ) : (
                        <span className="text-rose-400">Violated</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      {Object.entries(t.objectiveValues).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                    </td>
                    <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                      {Object.entries(t.parameters).map(([k, v]) => `${k}=${v}`).join(', ')}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{t.evaluationDurationMs}ms</td>
                    <td className="py-2 px-3 text-slate-500 text-[10px]">{t.timestamp.slice(11, 19)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
