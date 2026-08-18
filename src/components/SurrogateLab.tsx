import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Sparkles, 
  Play, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  HelpCircle,
  Zap,
  Target,
  ShieldAlert,
  Coins,
  Cpu
} from 'lucide-react';
import { Problem, OptimizationRun } from '../types';
import { GaussianProcessRegressor } from '../core/algorithms/gaussianProcess';
import { UniversalEvaluator } from '../core/evaluators/evaluator';
import { ActiveLearningEngine, AcquisitionConfig, AcquisitionType } from '../core/active_learning/activeLearningEngine';

interface SurrogateLabProps {
  problems: Problem[];
  runs: OptimizationRun[];
}

export const SurrogateLab: React.FC<SurrogateLabProps> = ({ problems, runs }) => {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(problems[0]?.id || '');
  const problem = problems.find(p => p.id === selectedProblemId) || problems[0];

  const [gpKernel, setGpKernel] = useState<'matern52' | 'rbf'>('matern52');
  const [noiseVar, setNoiseVar] = useState<number>(0.0001);
  const [activeVariable, setActiveVariable] = useState<string>(problem?.variables[0]?.name || '');
  
  // Acquisition Strategy Controls
  const [acqStrategy, setAcqStrategy] = useState<AcquisitionType>('ei');
  const [xiParam, setXiParam] = useState<number>(0.01);
  const [betaParam, setBetaParam] = useState<number>(2.0);
  const [costExponent, setCostExponent] = useState<number>(1.0);
  const [batchSize, setBatchSize] = useState<number>(1);

  // Synthetic / evaluated training data
  const [trainingPoints, setTrainingPoints] = useState<{ x: number; y: number; params: Record<string, any>; feasible?: boolean }[]>([]);
  const [validationMetrics, setValidationMetrics] = useState<{ rmse: number; r2Score: number } | null>(null);
  const [alEngine, setAlEngine] = useState<ActiveLearningEngine | null>(null);
  const [sliceData, setSliceData] = useState<any[]>([]);

  // Active Learning Step state
  const [activeStepHistory, setActiveStepHistory] = useState<{
    iteration: number;
    candidateVal: number;
    prediction: number;
    actual: number;
    uncertainty: number;
    error: number;
    strategy: string;
    acqScore: number;
  }[]>([]);

  const primaryObj = problem?.objectives[0];
  const activeVarObj = problem?.variables.find(v => v.name === activeVariable) || problem?.variables[0];

  // Initialize training set from existing runs or evaluate a sparse initial design
  const initializeTrainingData = async () => {
    if (!problem || !activeVarObj) return;

    const evaluator = new UniversalEvaluator(problem);
    const initialPts: { x: number; y: number; params: Record<string, any>; feasible?: boolean }[] = [];

    // Sample 6 initial points across range
    const numPts = 6;
    for (let i = 0; i < numPts; i++) {
      const frac = (i + 0.5) / numPts;
      const val = activeVarObj.lowerBound + frac * (activeVarObj.upperBound - activeVarObj.lowerBound);
      
      const testParams: Record<string, any> = {};
      problem.variables.forEach(v => {
        testParams[v.name] = v.name === activeVarObj.name ? val : (v.defaultValue ?? v.lowerBound);
      });

      const res = await evaluator.evaluate(testParams);
      if (res.status === 'successful' && primaryObj) {
        initialPts.push({
          x: val,
          y: res.objectiveValues[primaryObj.name] ?? 0,
          params: testParams,
          feasible: res.feasible,
        });
      }
    }

    setTrainingPoints(initialPts);
    fitSurrogate(initialPts);
  };

  useEffect(() => {
    if (problem) {
      setActiveVariable(problem.variables[0]?.name || '');
      initializeTrainingData();
    }
  }, [problem?.id]);

  const fitSurrogate = (pts: { x: number; y: number; params: Record<string, any>; feasible?: boolean }[]) => {
    if (!problem || !activeVarObj || pts.length < 2) return;

    const span = Math.max(activeVarObj.upperBound - activeVarObj.lowerBound, 1e-6);
    const engine = new ActiveLearningEngine(problem, 42);

    // Build normalized feature vectors for all variables
    const xNorm = pts.map(p => {
      return problem.variables.map(v => {
        const val = Number(p.params[v.name] ?? v.lowerBound);
        const s = Math.max(v.upperBound - v.lowerBound, 1e-6);
        return Math.min(Math.max((val - v.lowerBound) / s, 0), 1);
      });
    });
    const objectives = pts.map(p => p.y);
    const feasible = pts.map(p => p.feasible ?? true);

    const metrics = engine.fitSurrogates({ xNorm, objectives, feasible });
    setValidationMetrics({ rmse: metrics.objRmse, r2Score: metrics.objR2 });
    setAlEngine(engine);

    // Generate dense 1D slice grid for plotting
    const nSlice = 60;
    const grid: any[] = [];

    const acqConfig: AcquisitionConfig = {
      type: acqStrategy,
      xi: xiParam,
      beta: betaParam,
      costExponent,
      costFunction: (params) => 1.0 + Math.pow(Math.max(Number(params[activeVarObj.name] || 0), 0), 2) * 2.0,
    };

    for (let i = 0; i <= nSlice; i++) {
      const frac = i / nSlice;
      const physicalX = activeVarObj.lowerBound + frac * span;

      // Construct query vector holding other variables at default/lower bound
      const queryNorm = problem.variables.map(v => {
        if (v.name === activeVarObj.name) return frac;
        const s = Math.max(v.upperBound - v.lowerBound, 1e-6);
        return ((v.defaultValue ?? v.lowerBound) - v.lowerBound) / s;
      });

      const evalRes = engine.evaluateAcquisition(queryNorm, acqConfig);

      grid.push({
        x: Number(physicalX.toFixed(3)),
        mean: Number(evalRes.mean.toFixed(3)),
        upperBound: Number((evalRes.mean + 2 * evalRes.std).toFixed(3)),
        lowerBound: Number((evalRes.mean - 2 * evalRes.std).toFixed(3)),
        std: Number(evalRes.std.toFixed(3)),
        acquisition: Number((evalRes.acquisitionValue * 10).toFixed(4)), // scaled for visualization
        pFeasible: Number((evalRes.probabilityOfFeasibility * 100).toFixed(1)),
      });
    }

    setSliceData(grid);
  };

  // Perform Active Learning iteration (Select candidate by strategy -> Evaluate -> Update dataset)
  const handleActiveLearningStep = async () => {
    if (!alEngine || !problem || !activeVarObj || sliceData.length === 0) return;

    const acqConfig: AcquisitionConfig = {
      type: acqStrategy,
      xi: xiParam,
      beta: betaParam,
      costExponent,
      costFunction: (params) => 1.0 + Math.pow(Math.max(Number(params[activeVarObj.name] || 0), 0), 2) * 2.0,
    };

    const bestCandidate = alEngine.suggestNextCandidate(acqConfig, 500);
    const candidateVal = Number(bestCandidate.parameters[activeVarObj.name] ?? activeVarObj.lowerBound);
    const predictedMean = bestCandidate.mean;
    const uncertaintyStd = bestCandidate.std;

    // 2. Perform real evaluation
    const evaluator = new UniversalEvaluator(problem);
    const res = await evaluator.evaluate(bestCandidate.parameters);

    if (res.status === 'successful' && primaryObj) {
      const actualY = res.objectiveValues[primaryObj.name] ?? 0;
      const error = Math.abs(predictedMean - actualY);

      const newPts = [...trainingPoints, { 
        x: candidateVal, 
        y: actualY, 
        params: bestCandidate.parameters,
        feasible: res.feasible,
      }];
      setTrainingPoints(newPts);
      fitSurrogate(newPts);

      setActiveStepHistory(prev => [
        {
          iteration: prev.length + 1,
          candidateVal: Number(candidateVal.toFixed(3)),
          prediction: Number(predictedMean.toFixed(3)),
          actual: Number(actualY.toFixed(3)),
          uncertainty: Number(uncertaintyStd.toFixed(3)),
          error: Number(error.toFixed(3)),
          strategy: acqStrategy.toUpperCase(),
          acqScore: Number(bestCandidate.acquisitionValue.toFixed(4)),
        },
        ...prev,
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>PHASE 3 & 4: SURROGATE MODELING & ACTIVE LEARNING LOOP</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Active Learning & Gaussian Process Surrogate Lab</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Fit non-parametric GP regression, quantify predictive uncertainty (±2σ), and optimize candidate selection via Expected Improvement, UCB, Probability of Feasibility (cEI), and Cost-Aware sampling.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleActiveLearningStep}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Execute Active Learning Step ({acqStrategy.toUpperCase()})</span>
            </button>
          </div>
        </div>

        {/* Hyperparameter & Acquisition Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Problem</label>
            <select
              value={selectedProblemId}
              onChange={e => setSelectedProblemId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {problems.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Active Parameter Slice</label>
            <select
              value={activeVariable}
              onChange={e => {
                setActiveVariable(e.target.value);
                initializeTrainingData();
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
            >
              {problem?.variables.map(v => (
                <option key={v.id} value={v.name}>{v.name} ({v.unit || 'unitless'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Acquisition Strategy</label>
            <select
              value={acqStrategy}
              onChange={e => {
                setAcqStrategy(e.target.value as AcquisitionType);
                fitSurrogate(trainingPoints);
              }}
              className="w-full bg-slate-950 border border-cyan-800/80 text-cyan-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="ei">Expected Improvement (EI)</option>
              <option value="ucb">Upper Confidence Bound (UCB/LCB)</option>
              <option value="pi">Probability of Improvement (PI)</option>
              <option value="cei">Constrained EI (cEI)</option>
              <option value="cost_aware">Cost-Aware Weighted EI</option>
            </select>
          </div>

          {acqStrategy === 'ucb' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Exploration Beta (β)</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                max="10.0"
                value={betaParam}
                onChange={e => {
                  setBetaParam(Number(e.target.value));
                  fitSurrogate(trainingPoints);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Exploration Trade-off (ξ)</label>
              <input
                type="number"
                step="0.01"
                value={xiParam}
                onChange={e => {
                  setXiParam(Number(e.target.value));
                  fitSurrogate(trainingPoints);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Covariance Kernel</label>
            <select
              value={gpKernel}
              onChange={e => {
                setGpKernel(e.target.value as any);
                fitSurrogate(trainingPoints);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="matern52">Matérn 5/2 (Recommended)</option>
              <option value="rbf">RBF / Squared Exponential</option>
            </select>
          </div>
        </div>

        {/* Validation Metric Badges */}
        {validationMetrics && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500">OBSERVED EVALUATIONS: </span>
              <span className="text-slate-200 font-bold">{trainingPoints.length}</span>
            </div>
            <div>
              <span className="text-slate-500">SURROGATE RMSE: </span>
              <span className="text-emerald-400 font-bold">{validationMetrics.rmse.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-slate-500">SURROGATE R²: </span>
              <span className="text-cyan-400 font-bold">{validationMetrics.r2Score.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-slate-500">ACTIVE STRATEGY: </span>
              <span className="text-amber-400 font-bold uppercase">{acqStrategy}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Surrogate Mean, Uncertainty Envelope (±2σ) & Acquisition Surface</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Slice: {activeVariable} vs {primaryObj?.name}
          </span>
        </div>

        <div className="h-80 w-full bg-slate-950/50 rounded-lg p-3 border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sliceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="x" 
                stroke="#64748b" 
                fontSize={11} 
                tickFormatter={v => v.toFixed(2)}
                label={{ value: `${activeVariable} (${activeVarObj?.unit || 'unit'})`, position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11}
                label={{ value: primaryObj?.name || 'Objective', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />

              {/* Confidence Band */}
              <Area 
                type="monotone" 
                dataKey="upperBound" 
                stroke="none" 
                fill="#06b6d4" 
                fillOpacity={0.12} 
                name="Confidence Envelope (+2σ)" 
              />
              <Area 
                type="monotone" 
                dataKey="lowerBound" 
                stroke="none" 
                fill="#06b6d4" 
                fillOpacity={0.12} 
                name="Confidence Envelope (-2σ)" 
              />

              {/* GP Mean Line */}
              <Line 
                type="monotone" 
                dataKey="mean" 
                stroke="#06b6d4" 
                strokeWidth={2} 
                dot={false} 
                name="GP Posterior Mean (μ)" 
              />

              {/* Acquisition Function Curve */}
              <Line 
                type="monotone" 
                dataKey="acquisition" 
                stroke="#f59e0b" 
                strokeWidth={1.5} 
                strokeDasharray="4 4" 
                dot={false} 
                name={`Acquisition Surface (${acqStrategy.toUpperCase()})`} 
              />

              {/* Observed Points Scatter */}
              <Scatter 
                data={trainingPoints} 
                dataKey="y" 
                fill="#ef4444" 
                name="Evaluated Observations" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Learning Step Log History */}
      {activeStepHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Active Learning Candidate Recommendations & Validation Log</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">Step</th>
                  <th className="px-3 py-2">Strategy</th>
                  <th className="px-3 py-2">Suggested {activeVariable}</th>
                  <th className="px-3 py-2">Surrogate μ</th>
                  <th className="px-3 py-2">Surrogate ±2σ</th>
                  <th className="px-3 py-2">Acquisition Score</th>
                  <th className="px-3 py-2">Actual Evaluated</th>
                  <th className="px-3 py-2">Absolute Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeStepHistory.map((step) => (
                  <tr key={step.iteration} className="hover:bg-slate-950/40">
                    <td className="px-3 py-2 text-cyan-400 font-bold">#{step.iteration}</td>
                    <td className="px-3 py-2 text-amber-300 font-bold">{step.strategy}</td>
                    <td className="px-3 py-2 text-slate-200">{step.candidateVal}</td>
                    <td className="px-3 py-2 text-slate-300">{step.prediction}</td>
                    <td className="px-3 py-2 text-slate-400">±{(step.uncertainty * 2).toFixed(3)}</td>
                    <td className="px-3 py-2 text-amber-400">{step.acqScore}</td>
                    <td className="px-3 py-2 text-emerald-400 font-semibold">{step.actual}</td>
                    <td className="px-3 py-2 text-slate-400">{step.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
