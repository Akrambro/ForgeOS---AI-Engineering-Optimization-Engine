import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Zap,
  Cpu,
  Flame,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Sparkles,
  Gauge,
  Layers,
  Thermometer,
  ShieldCheck,
  Award,
  BarChart2,
  Bot
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import {
  EVThermalDynamicEnvironment,
  CSTRChemicalReactorEnvironment,
  InvertedPendulumEnvironment,
  RLEnvironment
} from '../core/rl/environment';
import { TabularQLearningAgent } from '../core/rl/qlearning';
import { DeepQNetworkAgent } from '../core/rl/neuralDQN';
import { ContinuousActorCriticAgent } from '../core/rl/actorCritic';
import { MetaRLOptimizerController } from '../core/rl/metaRLOptimizer';
import { BENCHMARK_CATALOG } from '../core/benchmarks/benchmarkSuite';
import { RLAlgorithmType, RLEnvironmentType, RLTrainingMetrics, RLTrajectoryPoint } from '../types';

export const ReinforcementLearningView: React.FC = () => {
  const [selectedEnv, setSelectedEnv] = useState<RLEnvironmentType>('ev_thermal_dynamic');
  const [selectedAlgo, setSelectedAlgo] = useState<RLAlgorithmType>('q_learning');

  // Hyperparameters
  const [episodes, setEpisodes] = useState<number>(40);
  const [learningRate, setLearningRate] = useState<number>(0.15);
  const [gamma, setGamma] = useState<number>(0.95);
  const [epsilon, setEpsilon] = useState<number>(0.8);

  // Training state
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [trainingMetrics, setTrainingMetrics] = useState<RLTrainingMetrics[]>([]);
  const [rolloutTrajectory, setRolloutTrajectory] = useState<RLTrajectoryPoint[]>([]);
  const [totalRolloutReward, setTotalRolloutReward] = useState<number | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Meta-RL State
  const [metaResults, setMetaResults] = useState<any | null>(null);

  const getEnvironmentInstance = (type: RLEnvironmentType, seed: number = 42): RLEnvironment => {
    switch (type) {
      case 'cstr_chemical_reactor':
        return new CSTRChemicalReactorEnvironment(seed, 60);
      case 'inverted_pendulum_actuator':
        return new InvertedPendulumEnvironment(seed, 80);
      case 'ev_thermal_dynamic':
      default:
        return new EVThermalDynamicEnvironment(seed, 60);
    }
  };

  // Run Training Loop
  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingMetrics([]);
    setRolloutTrajectory([]);
    setTotalRolloutReward(null);
    setMetaResults(null);

    // Yield UI thread to render spinner
    await new Promise(r => setTimeout(r, 50));

    try {
      if (selectedAlgo === 'meta_rl') {
        const metaCtrl = new MetaRLOptimizerController(42);
        const problem = BENCHMARK_CATALOG[0].problem;
        const res = await metaCtrl.optimizeWithMetaRL(problem, 20, 42);
        setMetaResults(res);
        setIsTraining(false);
        setTrainingProgress(100);
        return;
      }

      const env = getEnvironmentInstance(selectedEnv, 42);
      let metrics: RLTrainingMetrics[] = [];
      let rolloutRes: { trajectory: RLTrajectoryPoint[]; totalReward: number } = { trajectory: [], totalReward: 0 };

      if (selectedAlgo === 'q_learning') {
        const agent = new TabularQLearningAgent(env, {
          episodes,
          learningRate,
          discountFactorGamma: gamma,
          explorationEpsilon: epsilon,
          seed: 42,
        });

        metrics = agent.train((m) => {
          setTrainingProgress(Math.round((m.episode / episodes) * 100));
        });
        rolloutRes = agent.rollout(42);
      } else if (selectedAlgo === 'dqn') {
        const agent = new DeepQNetworkAgent(env, {
          episodes,
          learningRate,
          discountFactorGamma: gamma,
          explorationEpsilon: epsilon,
          seed: 42,
        });

        metrics = agent.train((m) => {
          setTrainingProgress(Math.round((m.episode / episodes) * 100));
        });
        rolloutRes = agent.rollout(42);
      } else if (selectedAlgo === 'actor_critic') {
        const agent = new ContinuousActorCriticAgent(env, {
          episodes,
          actorLearningRate: learningRate * 0.1,
          criticLearningRate: learningRate,
          discountFactorGamma: gamma,
          seed: 42,
        });

        metrics = agent.train((m) => {
          setTrainingProgress(Math.round((m.episode / episodes) * 100));
        });
        rolloutRes = agent.rollout(42);
      }

      setTrainingMetrics(metrics);
      setRolloutTrajectory(rolloutRes.trajectory);
      setTotalRolloutReward(rolloutRes.totalReward);
      setActiveStepIndex(rolloutRes.trajectory.length > 0 ? rolloutRes.trajectory.length - 1 : 0);
    } catch (err: any) {
      console.error('Training failed:', err);
    } finally {
      setIsTraining(false);
      setTrainingProgress(100);
    }
  };

  // Auto-run baseline demo on mount
  useEffect(() => {
    handleStartTraining();
  }, [selectedEnv, selectedAlgo]);

  const activeStepPoint = rolloutTrajectory[activeStepIndex] || null;

  // Prepare chart series for state rollout
  const trajectoryChartData = rolloutTrajectory.map((pt) => ({
    step: pt.step,
    reward: pt.reward,
    cumReward: pt.cumulativeReward,
    ...pt.state,
    ...(typeof pt.action === 'object' ? pt.action : { action: pt.action }),
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-950 text-indigo-400 border border-indigo-800">
              Phase 8 Architecture
            </span>
            <span className="text-xs text-slate-500 font-mono">Sequential Decision Control</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span>Reinforcement Learning & Policy Optimization</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Train closed-loop neural and tabular policies for real-time dynamic thermal control, non-linear chemical kinetics,
            and meta-reinforcement learning optimizer hyperparameter steering.
          </p>
        </div>

        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm shadow-lg shadow-indigo-950/50 flex items-center space-x-2 self-start md:self-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTraining ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin text-white" />
              <span>Training Policy ({trainingProgress}%)...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Train Policy & Run Rollout</span>
            </>
          )}
        </button>
      </div>

      {/* Top Configuration Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Environment Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Target Environment</span>
          </label>
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value as RLEnvironmentType)}
            disabled={isTraining}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ev_thermal_dynamic">EV Battery Active Thermal Management</option>
            <option value="cstr_chemical_reactor">CSTR Non-Linear Chemical Reactor</option>
            <option value="inverted_pendulum_actuator">Inverted Pendulum Continuous Actuator</option>
          </select>
        </div>

        {/* Algorithm Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>RL Algorithm</span>
          </label>
          <select
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value as RLAlgorithmType)}
            disabled={isTraining}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="q_learning">Tabular Q-Learning (State Discretization)</option>
            <option value="dqn">Deep Q-Network (Neural + Experience Replay)</option>
            <option value="actor_critic">Continuous Actor-Critic (Advantage A2C)</option>
            <option value="meta_rl">Meta-RL Dynamic Optimizer Adaptation</option>
          </select>
        </div>

        {/* Hyperparameter Adjustments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">Episodes</span>
            <span className="font-mono text-indigo-400 font-bold">{episodes}</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={episodes}
            onChange={(e) => setEpisodes(Number(e.target.value))}
            disabled={isTraining}
            className="w-full accent-indigo-500 bg-slate-950"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10 ep</span>
            <span>100 ep</span>
          </div>
        </div>

        {/* Learning Rate & Gamma */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">Learning Rate (α)</span>
            <span className="font-mono text-cyan-400 font-bold">{learningRate}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            disabled={isTraining}
            className="w-full accent-cyan-500 bg-slate-950"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.01 (Slow)</span>
            <span>0.50 (Aggressive)</span>
          </div>
        </div>
      </div>

      {/* Meta-RL Specific View */}
      {selectedAlgo === 'meta_rl' && metaResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Meta-RL Optimizer Hyperparameter Steering Log</span>
            </h2>
            <span className="text-xs font-mono bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full border border-emerald-800">
              Optimal Feasible Found: {metaResults.bestTrial?.objectiveValues?.mass?.toFixed(3) || 'Feasible'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono">TOTAL ADAPTATION ITERATIONS</div>
              <div className="text-xl font-bold text-white mt-1">{metaResults.trials.length}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono">STEERED PARAMETERS</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">DE Mutation F & Crossover CR</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono">BEST OBJECTIVE TRIAL</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">Trial #{metaResults.bestTrial?.iteration || 1}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-2.5 px-3">Iteration</th>
                  <th className="py-2.5 px-3">Adapted Mutation Factor (F)</th>
                  <th className="py-2.5 px-3">Adapted Crossover Rate (CR)</th>
                  <th className="py-2.5 px-3">Meta Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {metaResults.metaAdaptations.map((ad: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">Iter {ad.iteration}</td>
                    <td className="py-2 px-3 text-cyan-300">{ad.action.mutationFactorF}</td>
                    <td className="py-2 px-3 text-indigo-300">{ad.action.crossoverRateCR}</td>
                    <td className={`py-2 px-3 ${ad.reward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ad.reward > 0 ? `+${ad.reward}` : ad.reward}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Charts & Telemetry Grid */}
      {selectedAlgo !== 'meta_rl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Training Convergence Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Episode Cumulative Return (R_total)</span>
              </h2>
              {trainingMetrics.length > 0 && (
                <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                  Final: {trainingMetrics[trainingMetrics.length - 1].totalReward}
                </span>
              )}
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trainingMetrics}>
                  <defs>
                    <linearGradient id="rewardGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="episode" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Episode', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="totalReward" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#rewardGrad)" name="Return" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temporal Difference Loss & Epsilon Decay */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Bellman TD Error & Loss Curve</span>
              </h2>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="episode" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="meanLoss" stroke="#22d3ee" strokeWidth={2} dot={false} name="TD Loss" />
                  {trainingMetrics[0]?.epsilon !== undefined && (
                    <Line type="monotone" dataKey="epsilon" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Epsilon (ε)" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Trajectory Rollout Analysis (EV Thermal specific) */}
      {selectedAlgo !== 'meta_rl' && rolloutTrajectory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Thermometer className="w-5 h-5 text-rose-400" />
                <span>Deterministic Rollout Trajectory (Trained Policy)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Tracking temperature state regulation vs drive cycle acceleration pulses
              </p>
            </div>

            {totalRolloutReward !== null && (
              <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
                <span className="text-slate-400">Total Trajectory Reward:</span>
                <span className="font-bold text-emerald-400">{totalRolloutReward}</span>
              </div>
            )}
          </div>

          {/* Rollout State Curves */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="step" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Simulation Time (Seconds)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {selectedEnv === 'ev_thermal_dynamic' && (
                  <>
                    <Line type="monotone" dataKey="T_battery (°C)" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="T_Battery (°C)" />
                    <Line type="monotone" dataKey="T_coolant (°C)" stroke="#38bdf8" strokeWidth={1.8} dot={false} name="T_Coolant (°C)" />
                    <Line type="monotone" dataKey="Heat Generation Rate (kW)" stroke="#fbbf24" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Drive Cycle Heat (kW)" />
                  </>
                )}
                {selectedEnv === 'cstr_chemical_reactor' && (
                  <>
                    <Line type="monotone" dataKey="Reactor Temp T_R (K)" stroke="#f43f5e" strokeWidth={2} dot={false} name="T_Reactor (K)" />
                    <Line type="monotone" dataKey="Cooling Jacket Temp T_c (K)" stroke="#38bdf8" strokeWidth={2} dot={false} name="T_Cooling (K)" />
                  </>
                )}
                {selectedEnv === 'inverted_pendulum_actuator' && (
                  <>
                    <Line type="monotone" dataKey="cos(θ)" stroke="#818cf8" strokeWidth={2} dot={false} name="cos(θ)" />
                    <Line type="monotone" dataKey="Angular Velocity θ_dot (rad/s)" stroke="#22d3ee" strokeWidth={2} dot={false} name="θ_dot (rad/s)" />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Step-by-Step Inspector Slider */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Time-Step Inspector: <strong className="text-white">t = {activeStepIndex}s</strong></span>
              </span>
              <span className="font-mono text-slate-400">Step {activeStepIndex + 1} of {rolloutTrajectory.length}</span>
            </div>

            <input
              type="range"
              min={0}
              max={rolloutTrajectory.length - 1}
              value={activeStepIndex}
              onChange={(e) => setActiveStepIndex(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-900"
            />

            {activeStepPoint && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                {Object.entries(activeStepPoint.state).map(([k, v]) => (
                  <div key={k} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 truncate">{k}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{Number(v).toFixed(2)}</div>
                  </div>
                ))}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">STEP REWARD</div>
                  <div className={`text-sm font-bold mt-0.5 ${activeStepPoint.reward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeStepPoint.reward}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
