import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  PlusCircle, 
  History, 
  Settings2, 
  Edit3, 
  Flame, 
  Lock, 
  Play, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Clock,
  Compass,
  Cpu,
  Layers,
  Activity
} from 'lucide-react';
import { 
  Problem, 
  CandidateReviewItem, 
  ApprovalPolicyType, 
  ApprovalGateConfig, 
  HumanInterventionLog, 
  ForbiddenRegion 
} from '../types';
import { ExpertSteeringController } from '../core/hitl/expertSteering';
import { UniversalEvaluator } from '../core/evaluators/evaluator';

interface HumanInTheLoopViewProps {
  problem: Problem;
  onUpdateProblem?: (updatedProblem: Problem) => void;
}

export const HumanInTheLoopView: React.FC<HumanInTheLoopViewProps> = ({
  problem,
  onUpdateProblem
}) => {
  // Initialize Controller
  const [controller] = useState<ExpertSteeringController>(() => {
    const ctrl = new ExpertSteeringController(problem.id, {
      policy: 'high_risk_uncertainty',
      uncertaintyThreshold: 0.35,
      feasibilityRiskThreshold: 0.80,
      maxAutoCost: 50,
      batchInterval: 5,
    });

    // Seed mock queue for interactive demonstration
    const dDefault = Number(problem.variables[0]?.defaultValue ?? 1.2);
    const angleDefault = Number(problem.variables[1]?.defaultValue ?? 35);
    const mDefault = Number(problem.variables[2]?.defaultValue ?? 1.5);

    // Mock candidates
    ctrl.getApprovalGate().enqueue(
      {
        [problem.variables[0]?.name || 'hole_diameter']: dDefault * 1.45,
        [problem.variables[1]?.name || 'inclination_angle']: angleDefault + 18,
        [problem.variables[2]?.name || 'blowing_ratio']: mDefault * 1.6,
      },
      problem,
      4,
      undefined,
      0.92,
      75,
      250
    );

    ctrl.getApprovalGate().enqueue(
      {
        [problem.variables[0]?.name || 'hole_diameter']: dDefault * 0.95,
        [problem.variables[1]?.name || 'inclination_angle']: angleDefault - 5,
        [problem.variables[2]?.name || 'blowing_ratio']: mDefault * 1.1,
      },
      problem,
      5,
      undefined,
      0.78,
      25,
      120
    );

    return ctrl;
  });

  const [activeTab, setActiveTab] = useState<'queue' | 'steer' | 'inject' | 'forbidden' | 'logs' | 'policy'>('queue');
  const [steeringState, setSteeringState] = useState(controller.getState());

  // Edit / Modify Modal State
  const [modifyingItem, setModifyingItem] = useState<CandidateReviewItem | null>(null);
  const [modifiedParams, setModifiedParams] = useState<Record<string, number | string>>({});
  const [modificationReason, setModificationReason] = useState('Snapped to standard manufacturing reamer drill size.');

  // Rejection Modal State
  const [rejectingItem, setRejectingItem] = useState<CandidateReviewItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Structural baffle clash / unmanufacturable geometry.');
  const [createForbiddenOnReject, setCreateForbiddenOnReject] = useState(true);

  // Manual Injection State
  const [injectedValues, setInjectedValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    problem.variables.forEach(v => {
      init[v.name] = Number(v.defaultValue ?? v.lowerBound);
    });
    return init;
  });
  const [injectionReason, setInjectionReason] = useState('Flight-proven baseline geometry from prior test flight.');
  const [injectionStatus, setInjectionStatus] = useState<string | null>(null);

  // Dynamic ROI State
  const [roiBounds, setRoiBounds] = useState<Record<string, { lower: number; upper: number }>>(() => {
    const init: Record<string, { lower: number; upper: number }> = {};
    problem.variables.forEach(v => {
      init[v.name] = { lower: v.lowerBound, upper: v.upperBound };
    });
    return init;
  });

  // Dynamic Constraints
  const [constraintOverrides, setConstraintOverrides] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    problem.constraints.forEach(c => {
      init[c.id] = c.threshold;
    });
    return init;
  });

  const refreshState = () => {
    setSteeringState(controller.getState());
  };

  const handleApprove = (item: CandidateReviewItem) => {
    controller.approveCandidate(item.id, 'lead_engineer', 'Approved for simulation dispatch');
    refreshState();
  };

  const handleOpenModify = (item: CandidateReviewItem) => {
    setModifyingItem(item);
    setModifiedParams({ ...item.parameters });
  };

  const handleSaveModify = () => {
    if (!modifyingItem) return;
    controller.modifyCandidate(modifyingItem.id, modifiedParams, modificationReason, 'lead_engineer');
    setModifyingItem(null);
    refreshState();
  };

  const handleOpenReject = (item: CandidateReviewItem) => {
    setRejectingItem(item);
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    controller.rejectCandidate(rejectingItem.id, rejectionReason, 'lead_engineer', createForbiddenOnReject, 0.08);
    setRejectingItem(null);
    refreshState();
  };

  const handleInjectCandidate = async () => {
    setInjectionStatus('Injecting and evaluating through UniversalEvaluator...');
    controller.injectCandidate(injectedValues, injectionReason, 'chief_designer');
    try {
      const evalRes = await UniversalEvaluator.evaluate(problem, injectedValues);
      setInjectionStatus(`Candidate successfully evaluated! Status: ${evalRes.status.toUpperCase()}, Feasible: ${evalRes.feasible ? 'YES' : 'NO'}`);
      refreshState();
    } catch (e: any) {
      setInjectionStatus(`Evaluation error: ${e.message}`);
    }
  };

  const handleApplyRoiAndConstraints = () => {
    controller.setRegionOfInterest(roiBounds, 'Human expert trust-region zoom', 'lead_analyst');
    Object.entries(constraintOverrides).forEach(([cId, val]) => {
      controller.adjustConstraintThreshold(problem, cId, val, 'On-the-fly threshold adjustment', 'lead_analyst');
    });
    const updated = controller.applySteeringToProblem(problem);
    onUpdateProblem?.(updated);
    refreshState();
  };

  const handleUpdatePolicy = (policy: ApprovalPolicyType) => {
    controller.setPolicy({ policy }, 'lead_engineer');
    refreshState();
  };

  const handleSimulateNewCandidate = () => {
    // Generate simulated candidate
    const simulatedParams: Record<string, number> = {};
    problem.variables.forEach(v => {
      const span = v.upperBound - v.lowerBound;
      const rand = v.lowerBound + Math.random() * span;
      simulatedParams[v.name] = Number(rand.toFixed(3));
    });

    const cost = Math.floor(20 + Math.random() * 80);
    const duration = Math.floor(100 + Math.random() * 300);
    controller.getApprovalGate().enqueue(
      simulatedParams,
      problem,
      steeringState.pendingReviews.length + steeringState.reviewHistory.length + 1,
      undefined,
      Number((Math.random() * 0.9).toFixed(3)),
      cost,
      duration
    );
    refreshState();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg text-amber-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Human-in-the-Loop (HITL) Testing & Expert Steering</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                    Phase 7 Active
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Approval gate staging area, risk-aware uncertainty filtering, parameter overrides, manual injection, and search-space steering.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSimulateNewCandidate}
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs px-3.5 py-2 rounded-lg border border-slate-700 font-medium transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simulate Proposed Candidate</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'queue'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Approval Queue ({steeringState.pendingReviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('steer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'steer'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Search Steering & Dynamic ROI</span>
          </button>

          <button
            onClick={() => setActiveTab('inject')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'inject'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Manual Candidate Injection</span>
          </button>

          <button
            onClick={() => setActiveTab('forbidden')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'forbidden'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Forbidden Zones ({steeringState.forbiddenRegions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'logs'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({steeringState.interventionLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'policy'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Gate Policies</span>
          </button>
        </div>
      </div>

      {/* TAB 1: APPROVAL QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Pending Human Sign-off Staging Area ({steeringState.pendingReviews.length} candidates)
            </h3>
            <div className="text-xs text-slate-400">
              Active Policy: <span className="font-mono text-amber-300 font-semibold">{steeringState.approvalGateConfig.policy.toUpperCase()}</span>
            </div>
          </div>

          {steeringState.pendingReviews.length === 0 ? (
            <div className="p-12 bg-slate-900 border border-dashed border-slate-800 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <div className="text-sm font-medium text-slate-300">Approval Queue Empty</div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No candidates currently awaiting human verification. New high-risk or cost-gated candidates will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {steeringState.pendingReviews.map((item) => {
                const isHighRisk = item.riskScore >= 0.40;
                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-xl p-5 shadow-lg transition-all ${
                      isHighRisk ? 'border-rose-800/80 bg-rose-950/10' : 'border-amber-800/60 bg-amber-950/5'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isHighRisk ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-200">Candidate #{item.candidateIndex}</span>
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isHighRisk ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-900/60 text-amber-300'
                            }`}>
                              RISK SCORE: {(item.riskScore * 100).toFixed(0)}%
                            </span>
                            {item.estimatedCost && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                EST. COST: ${item.estimatedCost}
                              </span>
                            )}
                            {item.estimatedDurationMs && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                DURATION: {item.estimatedDurationMs} ms
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Queued on {new Date(item.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApprove(item)}
                          className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Dispatch</span>
                        </button>
                        <button
                          onClick={() => handleOpenModify(item)}
                          className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modify Parameters</span>
                        </button>
                        <button
                          onClick={() => handleOpenReject(item)}
                          className="inline-flex items-center space-x-1 bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-800 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {/* Parameters Grid */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(item.parameters).map(([key, val]) => (
                        <div key={key} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono">
                          <div className="text-[10px] text-slate-500 uppercase">{key}</div>
                          <div className="text-xs font-semibold text-cyan-300 mt-0.5">
                            {typeof val === 'number' ? val.toFixed(4) : val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Risk Factors Breakdown */}
                    {item.riskFactors.length > 0 && (
                      <div className="mt-3.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Identified Risk Factors:</div>
                        <ul className="list-disc list-inside text-xs text-rose-300 space-y-0.5">
                          {item.riskFactors.map((rf, idx) => (
                            <li key={idx}>{rf}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEARCH STEERING & DYNAMIC ROI */}
      {activeTab === 'steer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Expert Region of Interest (ROI) & Constraint Steering
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Restrict search domains to zoom into high-efficiency sweet-spots or adjust constraint thresholds on-the-fly during active experiments.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase">Variable Bounds (Region of Interest)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {problem.variables.map(v => (
                <div key={v.name} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-bold">{v.name}</span>
                    <span className="text-slate-500">Base: [{v.lowerBound}, {v.upperBound}] {v.unit}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">ROI LOWER BOUND</label>
                      <input
                        type="number"
                        value={roiBounds[v.name]?.lower ?? v.lowerBound}
                        onChange={e => setRoiBounds({
                          ...roiBounds,
                          [v.name]: { ...roiBounds[v.name], lower: Number(e.target.value) }
                        })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">ROI UPPER BOUND</label>
                      <input
                        type="number"
                        value={roiBounds[v.name]?.upper ?? v.upperBound}
                        onChange={e => setRoiBounds({
                          ...roiBounds,
                          [v.name]: { ...roiBounds[v.name], upper: Number(e.target.value) }
                        })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">Dynamic Constraint Thresholds</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {problem.constraints.map(c => (
                <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-bold">{c.name}</span>
                    <span className="text-slate-500">{c.operator} {c.threshold} {c.unit}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">ACTIVE THRESHOLD LIMIT</label>
                    <input
                      type="number"
                      value={constraintOverrides[c.id] ?? c.threshold}
                      onChange={e => setConstraintOverrides({
                        ...constraintOverrides,
                        [c.id]: Number(e.target.value)
                      })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplyRoiAndConstraints}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Apply Expert Steering & Re-evaluate Search Space</span>
          </button>
        </div>
      )}

      {/* TAB 3: MANUAL CANDIDATE INJECTION */}
      {activeTab === 'inject' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Expert Intuition Candidate Injection
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Directly inject domain-expert baseline geometries or physical prototypes into the surrogate training dataset.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {problem.variables.map(v => (
              <div key={v.name} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <label className="text-[10px] text-slate-400 font-mono uppercase">{v.name} ({v.unit})</label>
                <input
                  type="number"
                  value={injectedValues[v.name] ?? v.defaultValue ?? v.lowerBound}
                  onChange={e => setInjectedValues({
                    ...injectedValues,
                    [v.name]: Number(e.target.value)
                  })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono mt-1"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-mono uppercase">Engineering Rationale / Provenance Notes</label>
            <input
              type="text"
              value={injectionReason}
              onChange={e => setInjectionReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 font-mono mt-1"
              placeholder="e.g. Flight test baseline geometry from Engine Mark-3"
            />
          </div>

          {injectionStatus && (
            <div className="p-3 bg-slate-950 border border-cyan-800 rounded-lg text-xs font-mono text-cyan-300">
              {injectionStatus}
            </div>
          )}

          <button
            onClick={handleInjectCandidate}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Inject & Evaluate Candidate</span>
          </button>
        </div>
      )}

      {/* TAB 4: FORBIDDEN EXCLUSION ZONES */}
      {activeTab === 'forbidden' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Human-Rejected Forbidden Exclusion Zones ({steeringState.forbiddenRegions.length})
            </h3>
          </div>

          {steeringState.forbiddenRegions.length === 0 ? (
            <div className="p-8 bg-slate-950 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
              No forbidden exclusion regions active. Rejecting a candidate with the exclusion zone toggle enabled will register a penalty barrier here.
            </div>
          ) : (
            <div className="space-y-3">
              {steeringState.forbiddenRegions.map(region => (
                <div key={region.id} className="p-4 bg-slate-950 border border-rose-900/60 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-mono font-bold text-rose-200">{region.reason}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        RADIUS: {(region.radius * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-mono text-slate-400">
                      Center: {JSON.stringify(region.center)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      controller.getForbiddenManager().removeRegion(region.id);
                      refreshState();
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-300 text-xs font-mono"
                  >
                    Remove Zone
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Human Intervention & Decision Provenance Audit Log ({steeringState.interventionLogs.length} events)
          </h3>

          {steeringState.interventionLogs.length === 0 ? (
            <div className="p-8 bg-slate-950 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
              No human steering actions recorded yet. All approvals, rejections, modifications, and ROI updates are logged here immutably.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                    <th className="pb-2">TIMESTAMP</th>
                    <th className="pb-2">ACTION</th>
                    <th className="pb-2">ACTOR</th>
                    <th className="pb-2">RATIONALE / DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {steeringState.interventionLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-950/40">
                      <td className="py-2.5 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'approve' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          log.action === 'reject' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          log.action === 'modify' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                          'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">{log.actor}</td>
                      <td className="py-2.5 text-slate-400 max-w-md truncate">
                        {log.details.reason || JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: POLICY CONFIG */}
      {activeTab === 'policy' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Approval Gate Trigger Policy Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Define the strictness of the human gating barrier. Choose between autonomous execution, smart risk-triggered pauses, or mandatory manual review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                type: 'high_risk_uncertainty' as ApprovalPolicyType,
                name: 'High-Risk & Uncertainty Gated (Recommended)',
                desc: 'Auto-approves safe, confident candidates. Pauses only when surrogate uncertainty or boundary risk exceeds threshold.',
              },
              {
                type: 'always' as ApprovalPolicyType,
                name: 'Always Pause (Strict Verification)',
                desc: 'Every proposed candidate requires explicit human sign-off before simulation execution.',
              },
              {
                type: 'cost_gated' as ApprovalPolicyType,
                name: 'Cost & Budget Gated',
                desc: 'Auto-approves fast/cheap candidates. Gated only when estimated evaluation cost exceeds maximum budget threshold.',
              },
              {
                type: 'periodic_batch' as ApprovalPolicyType,
                name: 'Periodic Milestone Review',
                desc: 'Pauses for human batch signoff at regular iteration intervals (e.g. every 5 iterations).',
              },
              {
                type: 'disabled' as ApprovalPolicyType,
                name: 'Autonomous (Disabled Gate)',
                desc: 'Bypasses human gate completely for automated batch runs.',
              },
            ].map(p => (
              <div
                key={p.type}
                onClick={() => handleUpdatePolicy(p.type)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  steeringState.approvalGateConfig.policy === p.type
                    ? 'bg-amber-950/30 border-amber-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-100">{p.name}</span>
                  {steeringState.approvalGateConfig.policy === p.type && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Modify Candidate */}
      {modifyingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>Modify Candidate #{modifyingItem.candidateIndex}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Adjust parameters based on human manufacturing constraints, tool libraries, or expert intuition.
            </p>

            <div className="space-y-3">
              {Object.entries(modifiedParams).map(([key, val]) => (
                <div key={key} className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-xs font-mono text-slate-300">{key}</label>
                  <input
                    type="number"
                    value={val}
                    onChange={e => setModifiedParams({
                      ...modifiedParams,
                      [key]: Number(e.target.value)
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase">Modification Rationale</label>
              <input
                type="text"
                value={modificationReason}
                onChange={e => setModificationReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono mt-1"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setModifyingItem(null)}
                className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModify}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow"
              >
                Save & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Candidate */}
      {rejectingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-rose-300 font-mono flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Reject Candidate #{rejectingItem.candidateIndex}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Discard this candidate and prevent expensive simulator execution.
            </p>

            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase">Rejection Reason</label>
              <input
                type="text"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 font-mono mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createForbidden"
                checked={createForbiddenOnReject}
                onChange={e => setCreateForbiddenOnReject(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-rose-500"
              />
              <label htmlFor="createForbidden" className="text-xs text-slate-300">
                Register as Forbidden Exclusion Zone (penalizes future AI proposals nearby)
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
