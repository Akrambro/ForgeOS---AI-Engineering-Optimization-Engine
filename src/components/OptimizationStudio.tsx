import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  Sliders, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Layers, 
  BarChart2, 
  Eye,
  Info,
  Radio,
  Crosshair,
  Server
} from 'lucide-react';
import { Problem, OptimizationRun, AlgorithmType, Trial } from '../types';
import { OptimizationEngine } from '../core/algorithms/engine';
import { recommendOptimizationStrategy } from '../core/strategy/recommender';
import { ActiveTab } from './Navbar';

interface OptimizationStudioProps {
  problems: Problem[];
  selectedProblem: Problem;
  onSelectProblem: (p: Problem) => void;
  onRunFinished: (run: OptimizationRun) => void;
  onViewRunDetails: (run: OptimizationRun) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const OptimizationStudio: React.FC<OptimizationStudioProps> = ({
  problems,
  selectedProblem,
  onSelectProblem,
  onRunFinished,
  onViewRunDetails,
  setActiveTab,
}) => {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('differential_evolution');
  const [seed, setSeed] = useState<number>(42);
  const [budget, setBudget] = useState<number>(40);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Active run state
  const [currentRun, setCurrentRun] = useState<OptimizationRun | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [engineInstance, setEngineInstance] = useState<OptimizationEngine | null>(null);

  // Explainable recommendation
  const recommendation = recommendOptimizationStrategy(selectedProblem, budget);

  // Update default algorithm when problem changes
  useEffect(() => {
    setAlgorithm(recommendation.recommendedAlgorithm);
  }, [selectedProblem.id]);

  const handleStartRun = async () => {
    const runId = `run_${Date.now()}`;
    const newRun: OptimizationRun = {
      id: runId,
      problemId: selectedProblem.id,
      problemName: selectedProblem.name,
      algorithm,
      algorithmConfig: {},
      seed,
      budget,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      currentIteration: 0,
      trials: [],
    };

    setCurrentRun(newRun);
    setTrials([]);
    setIsExecuting(true);
    setIsPaused(false);

    const engine = new OptimizationEngine(selectedProblem);
    setEngineInstance(engine);

    try {
      const result = await engine.executeRun(
        {
          id: runId,
          algorithm,
          seed,
          budget,
        },
        {
          onTrialComplete: (trial, progress) => {
            setTrials(prev => [trial, ...prev]);
            setCurrentRun(prev => prev ? {
              ...prev,
              progress,
              currentIteration: trial.iteration,
              trials: [...prev.trials, trial],
            } : null);
          },
        }
      );

      const completedRun: OptimizationRun = {
        ...newRun,
        status: 'completed',
        progress: 1.0,
        completedAt: new Date().toISOString(),
        trials: [...trials],
        result,
      };

      setCurrentRun(completedRun);
      onRunFinished(completedRun);
    } catch (e: any) {
      console.error('Run execution error', e);
    } finally {
      setIsExecuting(false);
      setIsPaused(false);
    }
  };

  const handlePauseToggle = () => {
    if (!engineInstance) return;
    if (isPaused) {
      engineInstance.resume();
      setIsPaused(false);
    } else {
      engineInstance.pause();
      setIsPaused(true);
    }
  };

  const handleAbort = () => {
    if (!engineInstance) return;
    engineInstance.abort();
    setIsExecuting(false);
    setIsPaused(false);
  };

  const primaryObj = selectedProblem.objectives[0];
  const feasibleTrials = trials.filter(t => t.feasible && t.status === 'successful');
  const bestFeasible = feasibleTrials.length > 0 && primaryObj
    ? [...feasibleTrials].sort((a, b) => {
        const va = a.objectiveValues[primaryObj.name] ?? 0;
        const vb = b.objectiveValues[primaryObj.name] ?? 0;
        return primaryObj.direction === 'minimize' ? va - vb : vb - va;
      })[0]
    : null;

  return (
    <div className="space-y-6 text-slate-100 font-mono">
      {/* Studio Header & Configuration */}
      <div className="bg-[#081117] border border-[#49e6ff]/30 rounded p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#49e6ff] mb-1">
              <Cpu className="w-4 h-4 text-[#49e6ff]" />
              <span className="font-bold tracking-wider uppercase">OPTIMIZATION WORKBENCH & EXECUTION CONTROLLER</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight uppercase">ACTIVE CAMPAIGN EXECUTION ENGINE</h1>
            <p className="text-xs text-slate-400 mt-1">Select algorithm strategy, define seed parameters, and execute trial-by-trial optimization.</p>
          </div>

          <div className="flex items-center space-x-3">
            {isExecuting ? (
              <>
                <button
                  onClick={handlePauseToggle}
                  className="px-4 py-2 bg-[#0c1720] hover:bg-[#122332] text-[#ffb84d] border border-[#ffb84d]/50 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all"
                >
                  <Pause className="w-4 h-4 text-[#ffb84d]" />
                  <span>{isPaused ? 'Resume Job' : 'Pause Job'}</span>
                </button>
                <button
                  onClick={handleAbort}
                  className="px-4 py-2 bg-[#0c1720] hover:bg-[#122332] text-[#ff5964] border border-[#ff5964]/50 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all"
                >
                  <Square className="w-4 h-4 text-[#ff5964]" />
                  <span>Abort Job</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartRun}
                className="px-5 py-2.5 bg-[#0c1720] hover:bg-[#122332] text-[#62f6b4] border border-[#62f6b4]/60 hover:border-[#62f6b4] rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(98,246,180,0.2)]"
              >
                <Play className="w-4 h-4 text-[#62f6b4]" />
                <span>EXECUTE OPTIMIZATION CAMPAIGN</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Problem Selection & Algorithm Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[#49e6ff]/15 text-xs">
          <div>
            <label className="text-slate-400 block uppercase mb-1">Target Problem</label>
            <select
              value={selectedProblem.id}
              onChange={(e) => {
                const found = problems.find(p => p.id === e.target.value);
                if (found) onSelectProblem(found);
              }}
              disabled={isExecuting}
              className="w-full bg-[#05090d] border border-[#49e6ff]/30 text-white p-2 rounded focus:outline-none focus:border-[#49e6ff]"
            >
              {problems.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block uppercase mb-1">Optimization Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
              disabled={isExecuting}
              className="w-full bg-[#05090d] border border-[#49e6ff]/30 text-[#62f6b4] p-2 rounded focus:outline-none focus:border-[#62f6b4]"
            >
              <option value="differential_evolution">Differential Evolution (DE)</option>
              <option value="tpe">Tree-Structured Parzen Estimators (TPE)</option>
              <option value="bayesian_optimization">Bayesian Optimization (GP + EI)</option>
              <option value="nsga2">NSGA-II (Multi-Objective)</option>
              <option value="random_search">Random Search (Baseline)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block uppercase mb-1">Deterministic Seed</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              disabled={isExecuting}
              className="w-full bg-[#05090d] border border-[#49e6ff]/30 text-white p-2 rounded focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block uppercase mb-1">Evaluation Budget</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              disabled={isExecuting}
              className="w-full bg-[#05090d] border border-[#49e6ff]/30 text-white p-2 rounded focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Execution Monitor & Real-Time Trial Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-[#62f6b4]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">LIVE TRIAL EXECUTION STREAM</h2>
              </div>
              <span className="text-[10px] text-[#62f6b4]">
                {trials.length} / {budget} TRIALS EVALUATED
              </span>
            </div>

            {/* Trial Stream List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
              {trials.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  Ready for campaign execution. Click "EXECUTE OPTIMIZATION CAMPAIGN" above to begin.
                </div>
              ) : (
                trials.map((t) => (
                  <div
                    key={t.trialId}
                    className="p-2.5 bg-[#05090d] border border-slate-800 rounded flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-[#49e6ff] font-bold">#{t.iteration}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase ${t.feasible ? 'bg-[#62f6b4]/10 text-[#62f6b4] border border-[#62f6b4]/30' : 'bg-[#ff5964]/10 text-[#ff5964] border border-[#ff5964]/30'}`}>
                        {t.feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                      </span>
                    </div>

                    <div className="text-slate-300">
                      {primaryObj && (
                        <span>{primaryObj.name}: <strong className="text-[#62f6b4]">{Number(t.objectiveValues[primaryObj.name] ?? 0).toFixed(4)}</strong></span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500">{t.durationMs}ms</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Telemetry Column */}
        <div className="space-y-4">
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center space-x-2 border-b border-[#49e6ff]/10 pb-2">
              <Sparkles className="w-4 h-4 text-[#a97bff]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI STRATEGY RECOMMENDER</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">RECOMMENDED:</span>
                <span className="text-[#a97bff] font-bold uppercase">{recommendation.recommendedAlgorithm.replace('_', ' ')}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed bg-[#05090d] p-2 rounded border border-slate-800">
                {recommendation.reasons.join(' ')}
              </p>
            </div>
          </div>

          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-2">
            <div className="text-xs font-bold uppercase text-slate-400">BEST FEASIBLE SOLUTION</div>
            {bestFeasible ? (
              <div className="space-y-1 text-xs">
                <div className="text-[#62f6b4] font-bold text-base">
                  {primaryObj?.name}: {Number(bestFeasible.objectiveValues[primaryObj?.name || ''] ?? 0).toFixed(6)}
                </div>
                <div className="text-[10px] text-slate-400">Trial #{bestFeasible.iteration}</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-2">No feasible solutions recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
