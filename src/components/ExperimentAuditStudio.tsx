import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Download, 
  Upload, 
  Activity, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Layers, 
  Cpu, 
  GitCompare, 
  FileJson,
  Sparkles,
  TrendingDown,
  RefreshCw,
  Compass
} from 'lucide-react';
import { Problem, AlgorithmType, AuditTrialRecord, ExperimentCheckpoint, RunDiffReport } from '../types';
import { BENCHMARK_CATALOG } from '../core/benchmarks/benchmarkSuite';
import { ExperimentEngine } from '../core/experiment/experimentEngine';
import { AuditTrailManager } from '../core/experiment/auditTrail';
import { MetricsEngine } from '../core/experiment/metricsEngine';

interface ExperimentAuditStudioProps {
  problems: Problem[];
}

export const ExperimentAuditStudio: React.FC<ExperimentAuditStudioProps> = ({ problems }) => {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(problems[0]?.id || BENCHMARK_CATALOG[0].problem.id);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('differential_evolution');
  const [seed, setSeed] = useState<number>(42);
  const [budget, setBudget] = useState<number>(30);
  
  const [engine, setEngine] = useState<ExperimentEngine | null>(null);
  const [trials, setTrials] = useState<AuditTrialRecord[]>([]);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [activeTab, setActiveTab] = useState<'audit_trail' | 'metrics' | 'checkpoints' | 'diff'>('audit_trail');
  const [chainIntegrity, setChainIntegrity] = useState<{ isValid: boolean; error?: string }>({ isValid: true });
  const [savedCheckpoints, setSavedCheckpoints] = useState<ExperimentCheckpoint[]>([]);
  const [selectedDiffRunB, setSelectedDiffRunB] = useState<string>('');

  const activeProblem = problems.find(p => p.id === selectedProblemId) || BENCHMARK_CATALOG[0].problem;
  const isRunningRef = useRef<boolean>(false);

  // Initialize or reset experiment engine
  const handleInitializeEngine = () => {
    isRunningRef.current = false;
    const newEngine = new ExperimentEngine({
      experimentId: `exp_${Date.now().toString(36)}`,
      problem: activeProblem,
      algorithm,
      seed,
      budget,
      knownOptimum: 0.0,
    });
    setEngine(newEngine);
    setTrials([]);
    setEngineStatus('idle');
    setChainIntegrity({ isValid: true });
  };

  useEffect(() => {
    handleInitializeEngine();
  }, [selectedProblemId, algorithm, seed, budget]);

  // Step single iteration
  const handleStepOnce = async () => {
    if (!engine) return;
    try {
      setEngineStatus('stepping');
      await engine.stepOnce();
      const updatedTrials = engine.getTrials();
      setTrials(updatedTrials);
      setEngineStatus(engine.getStatus());
      setChainIntegrity(AuditTrailManager.verifyTrialChain(updatedTrials));
    } catch (e: any) {
      console.error(e);
      setEngineStatus('error');
    }
  };

  // Run all until budget
  const handleRunAll = async () => {
    if (!engine) return;
    isRunningRef.current = true;
    setEngineStatus('running');

    while (isRunningRef.current && engine.getCurrentStep() < budget) {
      try {
        await engine.stepOnce();
        const currentTrials = engine.getTrials();
        setTrials([...currentTrials]);
        setEngineStatus(engine.getStatus());
        setChainIntegrity(AuditTrailManager.verifyTrialChain(currentTrials));
        await new Promise(r => setTimeout(r, 20));
      } catch (err) {
        break;
      }
    }
    isRunningRef.current = false;
    setEngineStatus(engine.getStatus());
  };

  const handlePause = () => {
    isRunningRef.current = false;
    if (engine) {
      engine.pause();
      setEngineStatus('paused');
    }
  };

  // Checkpoint management
  const handleSaveCheckpoint = () => {
    if (!engine) return;
    const chk = engine.createCheckpoint();
    setSavedCheckpoints(prev => [chk, ...prev]);
  };

  const handleRestoreCheckpoint = (chk: ExperimentCheckpoint) => {
    try {
      const restored = ExperimentEngine.restoreFromCheckpoint(chk, activeProblem);
      setEngine(restored);
      setTrials(restored.getTrials());
      setEngineStatus(restored.getStatus());
      setChainIntegrity(AuditTrailManager.verifyTrialChain(restored.getTrials()));
    } catch (err: any) {
      alert(`Failed to restore checkpoint: ${err.message}`);
    }
  };

  // Export audit report
  const handleExportAuditJSON = () => {
    if (!engine) return;
    const chk = engine.createCheckpoint();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chk, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `experiment_audit_${chk.experimentId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Compute metrics
  const metrics = engine ? engine.getMetrics() : null;
  const primaryObj = activeProblem.objectives[0]?.name || 'value';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>PHASE 2: IMMUTABLE AUDIT TRAIL & EXPERIMENT ENGINE</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Experiment Engine & Audit Trail</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic step execution, Merkle hash chains, state checkpoints, regret metrics, and multi-run diff analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleInitializeEngine}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Engine</span>
            </button>

            <button
              onClick={handleSaveCheckpoint}
              disabled={trials.length === 0}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 disabled:opacity-40"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Create Checkpoint</span>
            </button>

            <button
              onClick={handleExportAuditJSON}
              disabled={trials.length === 0}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Audit JSON</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={handleStepOnce}
              disabled={engineStatus === 'running' || (engine && engine.getCurrentStep() >= budget)}
              className="inline-flex items-center space-x-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all disabled:opacity-40"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step 1 Iteration</span>
            </button>

            {engineStatus === 'running' ? (
              <button
                onClick={handlePause}
                className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleRunAll}
                disabled={engine && engine.getCurrentStep() >= budget}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition-all disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Continuous</span>
              </button>
            )}
          </div>
        </div>

        {/* Experiment Configuration Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Target Problem</label>
            <select
              value={selectedProblemId}
              onChange={e => setSelectedProblemId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500"
            >
              {problems.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Algorithm Strategy</label>
            <select
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value as AlgorithmType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500"
            >
              <option value="differential_evolution">Differential Evolution (DE/rand/1/bin)</option>
              <option value="bayesian_optimization">Bayesian Optimization (GP + EI)</option>
              <option value="random_search">Random Search (Baseline)</option>
              <option value="nsga_ii">NSGA-II (Multi-Objective)</option>
              <option value="tpe">Tree-structured Parzen Estimator (TPE)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">PRNG Seed</label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Max Budget</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* Live Status & Hash Chain Integrity */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${engineStatus === 'running' ? 'bg-emerald-400 animate-pulse' : engineStatus === 'completed' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
              <span className="uppercase text-[11px] font-semibold">Engine Status: {engineStatus}</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">
              Step <span className="text-cyan-400 font-bold">{trials.length}</span> / {budget}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {chainIntegrity.isValid ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audit Chain Verified (0 Tampering)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{chainIntegrity.error}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('audit_trail')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'audit_trail'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Audit Log & Merkle Chain ({trials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'metrics'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Regret & Convergence Curves</span>
        </button>

        <button
          onClick={() => setActiveTab('checkpoints')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'checkpoints'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Checkpoints ({savedCheckpoints.length})</span>
        </button>
      </div>

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit_trail' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Immutable Cryptographic Execution Ledger</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Merkle Root: {AuditTrailManager.computeMerkleRoot(trials).substring(0, 16)}...
              </span>
            </div>

            {trials.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                No trials executed yet. Click "Step 1 Iteration" or "Run Continuous" to generate cryptographic trial blocks.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Iter</th>
                      <th className="py-2 px-3">Trial Hash</th>
                      <th className="py-2 px-3">Previous Hash</th>
                      <th className="py-2 px-3">Parameters (X)</th>
                      <th className="py-2 px-3">{primaryObj} (Y)</th>
                      <th className="py-2 px-3">Feasible</th>
                      <th className="py-2 px-3">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trials.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">#{t.iteration}</td>
                        <td className="py-2.5 px-3 text-emerald-400 text-[11px]">{t.trialHash}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{t.previousTrialHash.substring(0, 12)}...</td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                          {Object.entries(t.parameters).map(([k, v]) => `${k}:${typeof v === 'number' ? v.toFixed(3) : v}`).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-white font-semibold">
                          {t.objectiveValues[primaryObj]?.toFixed(4) ?? 'N/A'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.feasible ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                            {t.feasible ? 'YES' : 'VIOLATION'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{t.evaluationDurationMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: METRICS & CONVERGENCE CURVES */}
      {activeTab === 'metrics' && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simple Regret */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase font-mono flex items-center space-x-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simple Regret (Distance to Global Optimum)</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {metrics.simpleRegret.length > 0 ? metrics.simpleRegret[metrics.simpleRegret.length - 1].toFixed(5) : 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Measures distance to the global optimum (f* = 0.0). Monotonically decreases as better candidates are discovered.
            </p>
            {/* Mini visual curve */}
            <div className="h-36 bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-end space-x-1 overflow-hidden">
              {metrics.simpleRegret.map((r, idx) => {
                const max = Math.max(...metrics.simpleRegret, 1);
                const heightPct = Math.max(4, Math.min(100, (r / max) * 100));
                return (
                  <div
                    key={idx}
                    title={`Iter ${idx + 1}: ${r}`}
                    className="flex-1 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Cumulative Regret */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase font-mono flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cumulative Regret (Total Opportunity Loss)</span>
              </h3>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                {metrics.cumulativeRegret.length > 0 ? metrics.cumulativeRegret[metrics.cumulativeRegret.length - 1].toFixed(2) : 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Total opportunity loss accumulated over exploration. Sub-linear growth indicates an efficient search strategy.
            </p>
            <div className="h-36 bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-end space-x-1 overflow-hidden">
              {metrics.cumulativeRegret.map((cr, idx) => {
                const max = Math.max(...metrics.cumulativeRegret, 1);
                const heightPct = Math.max(4, Math.min(100, (cr / max) * 100));
                return (
                  <div
                    key={idx}
                    title={`Iter ${idx + 1}: ${cr}`}
                    className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Feasibility Ratio Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase font-mono flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cumulative Feasibility Ratio</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {metrics.feasibilityRatioTrajectory.length > 0 ? `${(metrics.feasibilityRatioTrajectory[metrics.feasibilityRatioTrajectory.length - 1] * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Fraction of evaluated candidate solutions that strictly satisfy all linear and non-linear boundary constraints.
            </p>
            <div className="h-36 bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-end space-x-1 overflow-hidden">
              {metrics.feasibilityRatioTrajectory.map((fr, idx) => {
                const heightPct = Math.max(4, Math.min(100, fr * 100));
                return (
                  <div
                    key={idx}
                    title={`Iter ${idx + 1}: ${(fr * 100).toFixed(1)}%`}
                    className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Parameter Diversity */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase font-mono flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Search Space Diversity Index</span>
              </h3>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {metrics.parameterDiversityIndex.length > 0 ? metrics.parameterDiversityIndex[metrics.parameterDiversityIndex.length - 1].toFixed(4) : 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Normalized spatial variance across candidate evaluations. High values denote global exploration; low values denote local exploitation.
            </p>
            <div className="h-36 bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-end space-x-1 overflow-hidden">
              {metrics.parameterDiversityIndex.map((div, idx) => {
                const heightPct = Math.max(4, Math.min(100, div * 100));
                return (
                  <div
                    key={idx}
                    title={`Iter ${idx + 1}: ${div}`}
                    className="flex-1 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHECKPOINTS */}
      {activeTab === 'checkpoints' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Experiment State Checkpoints</span>
            </h2>
            <button
              onClick={handleSaveCheckpoint}
              disabled={trials.length === 0}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
            >
              Take Checkpoint Now
            </button>
          </div>

          {savedCheckpoints.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs font-mono">
              No saved checkpoints yet. Click "Create Checkpoint" to snapshot execution state.
            </div>
          ) : (
            <div className="space-y-3">
              {savedCheckpoints.map((chk) => (
                <div
                  key={chk.checkpointId}
                  className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 font-mono flex items-center space-x-2">
                      <span>{chk.checkpointId}</span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded">
                        Step {chk.stepNumber} / {chk.budget}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      Hash: {chk.latestTrialHash.substring(0, 16)}... | Created: {new Date(chk.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestoreCheckpoint(chk)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded border border-slate-700"
                    >
                      Restore & Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
