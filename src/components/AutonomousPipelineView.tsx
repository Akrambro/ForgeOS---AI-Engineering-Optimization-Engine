import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Activity, 
  FileText,
  Sliders,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { BENCHMARK_CATALOG } from '../core/benchmarks/benchmarkSuite';
import { AutonomousPipelineEngine } from '../core/autonomous/autonomousPipeline';
import { 
  AutonomousRunState, 
  PipelineStageType, 
  SynthesizedReport, 
  ParameterSensitivity,
  AnomalyEvent
} from '../core/autonomous/types';

export const AutonomousPipelineView: React.FC = () => {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(BENCHMARK_CATALOG[0].id);
  const [explorationBudget, setExplorationBudget] = useState<number>(10);
  const [activeLearningBudget, setActiveLearningBudget] = useState<number>(15);
  const [enableAutoRecovery, setEnableAutoRecovery] = useState<boolean>(true);
  const [useGeminiSynthesis, setUseGeminiSynthesis] = useState<boolean>(true);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentState, setCurrentState] = useState<AutonomousRunState | null>(null);
  const [finalReport, setFinalReport] = useState<SynthesizedReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stages' | 'anomalies' | 'sensitivity' | 'report'>('overview');

  const activeBenchmark = BENCHMARK_CATALOG.find(b => b.id === selectedBenchmarkId) || BENCHMARK_CATALOG[0];

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setFinalReport(null);

    const engine = new AutonomousPipelineEngine({
      problem: activeBenchmark.problem,
      maxTotalEvaluations: explorationBudget + activeLearningBudget,
      explorationBudget,
      activeLearningBudget,
      paretoRefinementGenerations: 10,
      convergenceWindow: 5,
      hypervolumeTolerance: 0.005,
      relativeObjTolerance: 0.01,
      enableAutoRecovery,
      useGeminiSynthesis,
      seed: Date.now() % 10000,
    });

    try {
      const report = await engine.executePipeline(
        (params) => {
          // Objective evaluator for selected benchmark
          const vals = Object.values(params).map(v => Number(v) || 0);
          if (activeBenchmark.category === 'A_convex') {
            return [vals.reduce((a, b) => a + b * b, 0)];
          } else if (activeBenchmark.category === 'B_non_convex') {
            // Ackley approx
            const d = vals.length || 1;
            const sumSq = vals.reduce((a, b) => a + b * b, 0);
            const sumCos = vals.reduce((a, b) => a + Math.cos(2 * Math.PI * b), 0);
            const ackley = -20 * Math.exp(-0.2 * Math.sqrt(sumSq / d)) - Math.exp(sumCos / d) + 20 + Math.E;
            return [Math.max(0, ackley)];
          } else if (activeBenchmark.category === 'D_multi_objective') {
            // ZDT1 approx
            const f1 = Math.max(0, vals[0] || 0);
            const g = 1 + 9 * (vals.slice(1).reduce((a, b) => a + b, 0) / Math.max(1, vals.length - 1));
            const f2 = g * (1 - Math.sqrt(Math.max(0, f1 / g)));
            return [f1, Math.max(0, f2)];
          } else {
            return [vals.reduce((a, b) => a + Math.abs(b), 0)];
          }
        },
        (state) => {
          setCurrentState({ ...state });
        }
      );

      setFinalReport(report);
      setCurrentState(engine.getState());
      setActiveTab('report');
    } catch (err) {
      console.error('Autonomous pipeline error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCurrentState(null);
    setFinalReport(null);
    setIsRunning(false);
    setActiveTab('overview');
  };

  const STAGES = [
    { key: PipelineStageType.EXPLORATION, label: '1. Exploration (LHS)', desc: 'Space-filling Latin Hypercube' },
    { key: PipelineStageType.SURROGATE_BOOTSTRAP, label: '2. Surrogate Bootstrap', desc: 'Gaussian Process with Matérn 5/2' },
    { key: PipelineStageType.ACTIVE_LEARNING_EXPLOITATION, label: '3. Active Learning', desc: 'Bayesian Acquisition Optimization' },
    { key: PipelineStageType.MULTI_OBJECTIVE_PARETO_REFINEMENT, label: '4. Pareto Refinement', desc: 'Non-dominated Sorting & Crowding' },
    { key: PipelineStageType.CONVERGENCE_ASSESSMENT, label: '5. Convergence Test', desc: 'Hypervolume Stationarity & Tolerance' },
    { key: PipelineStageType.DECISION_SYNTHESIS, label: '6. Decision Synthesis', desc: 'MCDM TOPSIS & Cryptographic Seal' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Autonomous Engineering Loop
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                    Phase 9 Complete
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Closed-loop self-directing optimization, epistemic surrogate orchestration, anomaly self-healing & AI synthesis.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={isRunning}
              className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Loop
            </button>
            <button
              onClick={handleRunPipeline}
              disabled={isRunning}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/25 flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Executing Loop...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Launch Autonomous Loop
                </>
              )}
            </button>
          </div>
        </header>

        {/* Configuration Bar */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Target Benchmark Problem
            </label>
            <select
              value={selectedBenchmarkId}
              onChange={(e) => setSelectedBenchmarkId(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {BENCHMARK_CATALOG.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Exploration Samples (LHS)
            </label>
            <input
              type="number"
              min={6}
              max={30}
              value={explorationBudget}
              onChange={(e) => setExplorationBudget(Number(e.target.value))}
              disabled={isRunning}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Active Exploitation Steps
            </label>
            <input
              type="number"
              min={8}
              max={40}
              value={activeLearningBudget}
              onChange={(e) => setActiveLearningBudget(Number(e.target.value))}
              disabled={isRunning}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              Self-Healing Anomaly Recovery
            </label>
            <button
              type="button"
              onClick={() => !isRunning && setEnableAutoRecovery(!enableAutoRecovery)}
              disabled={isRunning}
              className={`w-full px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-between ${
                enableAutoRecovery 
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>{enableAutoRecovery ? 'Auto-Healing Enabled' : 'Disabled'}</span>
              <CheckCircle2 className={`w-4 h-4 ${enableAutoRecovery ? 'text-emerald-400' : 'text-slate-500'}`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Technical Synthesis
            </label>
            <button
              type="button"
              onClick={() => !isRunning && setUseGeminiSynthesis(!useGeminiSynthesis)}
              disabled={isRunning}
              className={`w-full px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-between ${
                useGeminiSynthesis 
                  ? 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span>{useGeminiSynthesis ? 'Gemini 3.7 Flash' : 'Deterministic'}</span>
              <Sparkles className={`w-4 h-4 ${useGeminiSynthesis ? 'text-indigo-400' : 'text-slate-500'}`} />
            </button>
          </div>
        </section>

        {/* Stage Stepper Banner */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Autonomous Pipeline Stage Execution Workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {STAGES.map((stage, idx) => {
              const isCurrent = currentState?.currentStage === stage.key && isRunning;
              const isPast = currentState?.stageHistory.some(s => s.stage === stage.key);

              return (
                <div
                  key={stage.key}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-900/30'
                      : isPast
                      ? 'bg-slate-800/80 border-emerald-600/40'
                      : 'bg-slate-950/50 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">Stage {idx + 1}</span>
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />}
                    {isPast && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-xs font-medium text-slate-100">{stage.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{stage.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          {[
            { key: 'overview', label: 'Telemetry & Overview', icon: Activity },
            { key: 'stages', label: `Stage Execution Log (${currentState?.stageHistory.length || 0})`, icon: Layers },
            { key: 'anomalies', label: `Anomalies & Recovery (${currentState?.anomalies.length || 0})`, icon: AlertTriangle },
            { key: 'sensitivity', label: 'Sobol Sensitivity Ranking', icon: TrendingDown },
            { key: 'report', label: 'Engineering Decision Report', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Telemetry & Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-slate-200 flex items-center justify-between">
                <span>Optimization Telemetry</span>
                <span className="text-xs font-normal text-slate-400">
                  Total Trials Evaluated: {currentState?.evaluatedTrials.length || 0}
                </span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Active Stage</div>
                  <div className="text-sm font-bold text-indigo-400 truncate mt-1">
                    {currentState?.currentStage.replace(/_/g, ' ') || 'IDLE'}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Best Objective Score</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    {currentState?.bestCandidate?.objectives[0]?.value !== undefined
                      ? currentState.bestCandidate.objectives[0].value.toFixed(4)
                      : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Pareto Front Size</div>
                  <div className="text-sm font-bold text-amber-400 mt-1">
                    {currentState?.paretoFront.length || 0} solutions
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400">Anomalies Resolved</div>
                  <div className="text-sm font-bold text-sky-400 mt-1">
                    {currentState?.anomalies.filter(a => a.resolved).length || 0} / {currentState?.anomalies.length || 0}
                  </div>
                </div>
              </div>

              {/* Best Candidate Parameters */}
              {currentState?.bestCandidate && (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mt-4">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Current Best Candidate Parameter State
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-mono">
                    {Object.entries(currentState.bestCandidate.parameters).map(([key, val]) => (
                      <div key={key} className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-slate-400">{key}:</span>{' '}
                        <span className="text-indigo-300 font-semibold">
                          {typeof val === 'number' ? val.toFixed(4) : val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Benchmark Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                Benchmark Specifications
              </h3>
              <div className="text-xs text-slate-300 leading-relaxed">
                {activeBenchmark.description}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-200">{activeBenchmark.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Dimensions (Variables):</span>
                  <span className="font-semibold text-slate-200">{activeBenchmark.problem.variables.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Physical Objectives:</span>
                  <span className="font-semibold text-slate-200">{activeBenchmark.problem.objectives.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Known Optimum:</span>
                  <span className="font-semibold text-emerald-400">
                    {activeBenchmark.knownOptimum ? JSON.stringify(activeBenchmark.knownOptimum.objectives) : 'Non-convex Pareto set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stages Log */}
        {activeTab === 'stages' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Stage Execution Timeline</h3>
            {(!currentState || currentState.stageHistory.length === 0) ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No stages executed yet. Launch the autonomous loop to view live execution checkpoints.
              </div>
            ) : (
              <div className="space-y-3">
                {currentState.stageHistory.map((s, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                          Stage {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">
                          {s.stage.replace(/_/g, ' ')}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-xs text-slate-400">{s.message}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Duration: <span className="text-slate-200 font-mono">{s.durationMs} ms</span></div>
                      <div>Evaluations: <span className="text-slate-200 font-mono">{s.trialsEvaluated}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Anomalies */}
        {activeTab === 'anomalies' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Self-Healing Anomaly Event Stream</h3>
            {(!currentState || currentState.anomalies.length === 0) ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No numerical or boundary anomalies detected during current optimization run.
              </div>
            ) : (
              <div className="space-y-3">
                {currentState.anomalies.map((a, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-lg border border-amber-900/30 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-300">{a.type}</span>
                        <span className="text-xs text-slate-400">at Trial #{a.iteration}</span>
                      </div>
                      <p className="text-xs text-slate-300">{a.description}</p>
                      {a.recoveryAction && (
                        <p className="text-xs text-emerald-400 font-medium">Recovery applied: {a.recoveryAction}</p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
                      Resolved
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Sensitivity Ranking */}
        {activeTab === 'sensitivity' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Parameter Sensitivity Ranking (Sobol First-Order Decomposition)</h3>
            {(!finalReport || finalReport.sensitivities.length === 0) ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Run the autonomous loop to calculate surrogate-based parameter variance sensitivity indices.
              </div>
            ) : (
              <div className="space-y-4">
                {finalReport.sensitivities.map((s, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-sm font-semibold text-indigo-300">{s.parameterName}</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        s.impactLevel === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {s.impactLevel}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, s.firstOrderIndex * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>First-Order Sensitivity Index: <b className="text-slate-200 font-mono">{s.firstOrderIndex.toFixed(4)}</b></span>
                      <span>Total Index (with cross-terms): <b className="text-slate-200 font-mono">{s.totalIndex.toFixed(4)}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Technical Report */}
        {activeTab === 'report' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            {!finalReport ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                Execute the autonomous loop to synthesize the automated technical engineering report.
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-800 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      Synthesized Engineering Optimization Report
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Generated on {new Date(finalReport.timestamp).toLocaleString()} • Source: <span className="text-indigo-400 font-semibold">{finalReport.source}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-mono font-semibold rounded-lg flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Merkle Seal: {finalReport.merkleRootHash.slice(0, 12)}...
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Executive Summary</h4>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {finalReport.executiveSummary}
                  </p>
                </div>

                {/* Recommended Candidate */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recommended Compromise Candidate (TOPSIS Closeness: {finalReport.topsisDecisionScore.toFixed(4)})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    {Object.entries(finalReport.recommendedCandidate.parameters).map(([k, v]) => (
                      <div key={k} className="bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400">{k}:</span>{' '}
                        <span className="text-emerald-400 font-bold">
                          {typeof v === 'number' ? v.toFixed(4) : v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engineering Insights & Next Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Engineering Insights</h4>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {finalReport.engineeringInsights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recommended Next Steps</h4>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {finalReport.recommendedNextSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
