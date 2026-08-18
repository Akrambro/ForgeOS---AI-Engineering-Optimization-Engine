import React, { useState } from 'react';
import { 
  BarChart3, 
  Play, 
  TrendingDown, 
  ShieldCheck, 
  Clock, 
  Award, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { BENCHMARK_CATALOG, runComparativeBenchmark } from '../core/benchmarks/benchmarkSuite';
import { BenchmarkReport, AlgorithmType } from '../types';

export const BenchmarkView: React.FC = () => {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('benchmark_ev_thermal');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<AlgorithmType[]>([
    'random_search',
    'differential_evolution',
    'tpe',
    'bayesian_optimization',
  ]);
  const [seed, setSeed] = useState<number>(42);
  const [budget, setBudget] = useState<number>(40);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeRunningAlg, setActiveRunningAlg] = useState<string>('');
  const [report, setReport] = useState<BenchmarkReport | null>(null);

  const selectedBench = BENCHMARK_CATALOG.find(b => b.id === selectedBenchmarkId) || BENCHMARK_CATALOG[0];

  const handleRunComparative = async () => {
    setIsRunning(true);
    try {
      const rep = await runComparativeBenchmark(
        selectedBench,
        selectedAlgorithms,
        seed,
        budget,
        (alg) => {
          setActiveRunningAlg(alg);
        }
      );
      setReport(rep);
    } catch (e) {
      console.error('Benchmark execution failure', e);
    } finally {
      setIsRunning(false);
      setActiveRunningAlg('');
    }
  };

  const toggleAlgorithm = (alg: AlgorithmType) => {
    if (selectedAlgorithms.includes(alg)) {
      if (selectedAlgorithms.length > 1) {
        setSelectedAlgorithms(selectedAlgorithms.filter(a => a !== alg));
      }
    } else {
      setSelectedAlgorithms([...selectedAlgorithms, alg]);
    }
  };

  // Chart data for objective comparison
  const chartData = report?.results.map(r => ({
    name: r.algorithmName,
    bestObjective: Number(r.bestObjective.toFixed(3)),
    violations: r.constraintViolations,
    timeMs: Number(r.executionTimeMs.toFixed(1)),
    convergenceRate: r.convergenceRate,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#081117] border border-[#49e6ff]/30 rounded p-5 shadow-xl font-mono">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#49e6ff] mb-1">
              <BarChart3 className="w-4 h-4 text-[#49e6ff]" />
              <span className="font-bold tracking-wider uppercase">SCIENTIFIC VALIDATION LAB & COMPARATIVE SUITE</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight uppercase">ALGORITHM COMPARATIVE BENCHMARK HARNESS</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute standardized multi-algorithm evaluations across convex, multimodal, constrained, multi-objective, and surrogate benchmark problems.
            </p>
          </div>

          <button
            onClick={handleRunComparative}
            disabled={isRunning}
            className="px-5 py-2.5 bg-[#0c1720] hover:bg-[#122332] text-[#62f6b4] border border-[#62f6b4]/60 hover:border-[#62f6b4] rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(98,246,180,0.2)] disabled:opacity-50"
          >
            <Play className="w-4 h-4 text-[#62f6b4]" />
            <span>{isRunning ? `Benchmarking ${activeRunningAlg}...` : 'Execute Comparative Suite'}</span>
          </button>
        </div>

        {/* Benchmark & Algorithm Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[#49e6ff]/15">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Benchmark Problem</label>
            <select
              value={selectedBenchmarkId}
              onChange={e => {
                setSelectedBenchmarkId(e.target.value);
                setReport(null);
              }}
              className="w-full bg-[#05090d] border border-[#49e6ff]/30 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#49e6ff]"
            >
              {BENCHMARK_CATALOG.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{selectedBench.description}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Trial Budget</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              className="w-full bg-[#05090d] border border-[#49e6ff]/30 rounded px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Evaluation Seed</label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Algorithm Select Toggles */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-2">Algorithms to Compare:</span>
          {[
            { id: 'random_search', label: 'Random Search' },
            { id: 'differential_evolution', label: 'Differential Evolution' },
            { id: 'tpe', label: 'TPE' },
            { id: 'bayesian_optimization', label: 'Bayesian Opt (GP)' },
          ].map(alg => {
            const isSelected = selectedAlgorithms.includes(alg.id as any);
            return (
              <button
                key={alg.id}
                onClick={() => toggleAlgorithm(alg.id as any)}
                className={`text-xs px-3 py-1 rounded-md border transition-all ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-medium'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                {alg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Benchmark Report Results */}
      {report ? (
        <div className="space-y-6">
          {/* Bar Chart Comparison */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Objective Value Comparison ({report.benchmarkName})</span>
            </h2>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                  />
                  <Legend />
                  <Bar dataKey="bestObjective" name="Best Objective Value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="violations" name="Constraint Violations" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scientific Metrics Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Standardized Scientific Performance Metrics</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-2.5 px-3">Algorithm</th>
                    <th className="py-2.5 px-3">Evaluations</th>
                    <th className="py-2.5 px-3">Best Feasible Objective</th>
                    <th className="py-2.5 px-3">Constraint Violations</th>
                    <th className="py-2.5 px-3">Convergence Rate</th>
                    <th className="py-2.5 px-3">Wall Clock Time</th>
                    <th className="py-2.5 px-3">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {report.results.map((r, idx) => (
                    <tr key={r.algorithm} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-100 flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                        <span>{r.algorithmName}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{r.evaluationsCompleted}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{Number(r.bestObjective).toFixed(4)}</td>
                      <td className="py-3 px-3 text-slate-300">{r.constraintViolations}</td>
                      <td className="py-3 px-3 text-cyan-300">{r.convergenceRate} trials</td>
                      <td className="py-3 px-3 text-slate-400">{r.executionTimeMs} ms</td>
                      <td className="py-3 px-3 text-slate-200">{r.successRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {report.knownOptimum && (
              <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs font-mono text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Analytical Ground Truth Reference: Objective = {Object.values(report.knownOptimum.objectives)[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3">
          <BarChart3 className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Benchmark Results in View</h3>
          <p className="text-xs max-w-md mx-auto">
            Click "Run Comparative Suite" above to execute synchronized trials of Random Search, DE, TPE, and Bayesian Optimization on {selectedBench.name}.
          </p>
        </div>
      )}
    </div>
  );
};
