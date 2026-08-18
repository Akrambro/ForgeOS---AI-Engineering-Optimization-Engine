import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  FlaskConical, 
  Download, 
  ChevronRight, 
  ChevronDown,
  Layers,
  Activity,
  Lock,
  GitCompare,
  Compass,
  Sparkles,
  Zap,
  GitFork,
  Cpu,
  UserCheck,
  Bot
} from 'lucide-react';
import { Phase1TestSuite, TestResult } from '../core/tests/phase1.test';
import { Phase2TestSuite } from '../core/tests/phase2.test';
import { Phase3TestSuite } from '../core/tests/phase3.test';
import { Phase4TestSuite } from '../core/tests/phase4.test';
import { Phase5TestSuite } from '../core/tests/phase5.test';
import { Phase6TestSuite } from '../core/tests/phase6.test';
import { Phase7TestSuite } from '../core/tests/phase7.test';
import { Phase8TestSuite } from '../core/tests/phase8.test';
import { Phase9TestSuite } from '../core/tests/phase9.test';

export const MasterTestRunner: React.FC = () => {
  const [activeSuite, setActiveSuite] = useState<'all' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'phase6' | 'phase7' | 'phase8' | 'phase9'>('all');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTest, setActiveTest] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSummary(null);

    const allResults: TestResult[] = [];
    let passedCount = 0;
    let totalCount = 0;

    try {
      if (activeSuite === 'phase1' || activeSuite === 'all') {
        const p1 = await Phase1TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p1.results);
        passedCount += p1.passed;
        totalCount += p1.total;
      }

      if (activeSuite === 'phase2' || activeSuite === 'all') {
        const p2 = await Phase2TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p2.results);
        passedCount += p2.passed;
        totalCount += p2.total;
      }

      if (activeSuite === 'phase3' || activeSuite === 'all') {
        const p3 = await Phase3TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p3.results);
        passedCount += p3.passed;
        totalCount += p3.total;
      }

      if (activeSuite === 'phase4' || activeSuite === 'all') {
        const p4 = await Phase4TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p4.results);
        passedCount += p4.passed;
        totalCount += p4.total;
      }

      if (activeSuite === 'phase5' || activeSuite === 'all') {
        const p5 = await Phase5TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p5.results);
        passedCount += p5.passed;
        totalCount += p5.total;
      }

      if (activeSuite === 'phase6' || activeSuite === 'all') {
        const p6 = await Phase6TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p6.results);
        passedCount += p6.passed;
        totalCount += p6.total;
      }

      if (activeSuite === 'phase7' || activeSuite === 'all') {
        const p7 = await Phase7TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p7.results);
        passedCount += p7.passed;
        totalCount += p7.total;
      }

      if (activeSuite === 'phase8' || activeSuite === 'all') {
        const p8 = await Phase8TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p8.results);
        passedCount += p8.passed;
        totalCount += p8.total;
      }

      if (activeSuite === 'phase9' || activeSuite === 'all') {
        const p9 = await Phase9TestSuite.runAllTests((name) => setActiveTest(name));
        allResults.push(...p9.results);
        passedCount += p9.passed;
        totalCount += p9.total;
      }

      setTestResults(allResults);
      setSummary({ passed: passedCount, total: totalCount });
    } catch (e) {
      console.error('Test harness failure', e);
    } finally {
      setIsRunning(false);
      setActiveTest('');
    }
  };

  const exportTestReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      title: 'Scientific Optimization Suite Master Verification Report',
      suite: activeSuite,
      timestamp: new Date().toISOString(),
      summary,
      results: testResults,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `scientific_test_report_phases1_5_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
              <FlaskConical className="w-4 h-4" />
              <span>SCIENTIFIC TEST HARNESS & MASTER RE-EVALUATION SUITE</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Master Verification Matrix (Phases 1-9: 63 Tests)</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated deterministic verification for PRNG reproducibility, DE/BO/NSGA-II algorithms, cryptographic audit trail Merkle chains, state checkpoints, Gaussian Process surrogates (±2σ), Active Learning acquisition (EI/UCB/PI/cEI/Cost), Multi-Objective Pareto & MCDM (TOPSIS, Hypervolume, GD/IGD, Knee Point), Real Simulator Adapters, Human-in-the-Loop Steering, Reinforcement Learning & Sequential Control, and Phase 9 Autonomous Engineering Loop (Sobol Sensitivity, State Transitions, Anomaly Self-Healing, and Automated Technical Reports).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {testResults.length > 0 && (
              <button
                onClick={exportTestReport}
                className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-lg border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report JSON</span>
              </button>
            )}

            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>
                {isRunning 
                  ? `Running ${activeTest}...` 
                  : `Run ${activeSuite === 'all' ? 'All (49 Tests)' : activeSuite === 'phase1' ? 'Phase 1 (7 Tests)' : activeSuite === 'phase2' ? 'Phase 2 (7 Tests)' : activeSuite === 'phase3' ? 'Phase 3 (7 Tests)' : activeSuite === 'phase4' ? 'Phase 4 (7 Tests)' : activeSuite === 'phase5' ? 'Phase 5 (7 Tests)' : activeSuite === 'phase6' ? 'Phase 6 (7 Tests)' : 'Phase 7 (7 Tests)'}`}
              </span>
            </button>
          </div>
        </div>

        {/* Suite Selection Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSuite('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSuite === 'all'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Verification Suites (49 Tests)
          </button>

          <button
            onClick={() => setActiveSuite('phase1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSuite === 'phase1'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Phase 1: Basic Optimizer Suite (7 Tests)
          </button>

          <button
            onClick={() => setActiveSuite('phase2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSuite === 'phase2'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Phase 2: Experiment Engine & Audit Trail (7 Tests)
          </button>

          <button
            onClick={() => setActiveSuite('phase3')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase3'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Phase 3: GP Surrogate (7 Tests)</span>
          </button>

          <button
            onClick={() => setActiveSuite('phase4')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase4'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Phase 4: Active Learning (7 Tests)</span>
          </button>

          <button
            onClick={() => setActiveSuite('phase5')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase5'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-purple-400" />
            <span>Phase 5: Pareto & MCDM (7 Tests)</span>
          </button>

          <button
            onClick={() => setActiveSuite('phase6')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase6'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phase 6: Simulator Adapters (7 Tests)</span>
          </button>

          <button
            onClick={() => setActiveSuite('phase7')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase7'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Phase 7: Human-in-the-Loop (7 Tests)</span>
          </button>

          <button
            onClick={() => setActiveSuite('phase8')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase8'
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phase 8: Reinforcement Learning (7 Tests)</span>
          </button>

          <button
            onClick={() => setActiveSuite('phase9')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeSuite === 'phase9'
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Phase 9: Autonomous Engineering Loop (7 Tests)</span>
          </button>
        </div>

        {/* Summary Metric Strip */}
        {summary && (
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className={`p-3 rounded-lg border ${summary.passed === summary.total ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}>
              <div className="text-[10px] text-slate-400">TEST STATUS</div>
              <div className="text-lg font-bold mt-0.5">
                {summary.passed === summary.total ? '✓ 100% ALL TESTS PASSED' : `${summary.total - summary.passed} FAILED`}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">PASS RATE</div>
              <div className="text-lg font-bold text-cyan-400 mt-0.5">
                {summary.passed} / {summary.total} ({(summary.passed / summary.total * 100).toFixed(0)}%)
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">TOTAL EXECUTION TIME</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                {testResults.reduce((acc, r) => acc + r.durationMs, 0)} ms
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tests Results List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Verification Test Matrix ({testResults.length} Executed)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {testResults.filter(t => t.status === 'passed').length} / {testResults.length} Passed
          </span>
        </div>

        {testResults.length === 0 && !isRunning ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono space-y-2">
            <FlaskConical className="w-8 h-8 text-cyan-400/50 mx-auto" />
            <div>No test results yet. Click "Run Tests" to execute the scientific verification suite.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {testResults.map((test) => {
              const isExpanded = expandedTestId === test.id;
              return (
                <div
                  key={test.id}
                  className={`rounded-lg border transition-all ${
                    test.status === 'passed'
                      ? 'bg-slate-950/70 border-emerald-900/40 hover:border-emerald-700/60'
                      : 'bg-slate-950/70 border-rose-900/40 hover:border-rose-700/60'
                  }`}
                >
                  <div
                    onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      {test.status === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-slate-100 flex items-center space-x-2">
                          <span>{test.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                            {test.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{test.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span className="text-slate-400">{test.durationMs} ms</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        test.status === 'passed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {test.status}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON details */}
                  {isExpanded && test.details && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-900">
                      <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase">Assertion Context & Execution Details:</div>
                      <pre className="p-3 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
