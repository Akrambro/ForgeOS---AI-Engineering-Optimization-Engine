import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  FlaskConical, 
  Clock, 
  Download, 
  ChevronRight, 
  ChevronDown,
  Sparkles,
  Layers,
  Cpu
} from 'lucide-react';
import { Phase1TestSuite, TestResult } from '../core/tests/phase1.test';

export const Phase1TestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeTest, setActiveTest] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  const handleRunAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSummary(null);

    try {
      const outcome = await Phase1TestSuite.runAllTests((testName, passed) => {
        setActiveTest(testName);
      });
      setTestResults(outcome.results);
      setSummary({ passed: outcome.passed, total: outcome.total });
    } catch (e) {
      console.error('Test harness failure', e);
    } finally {
      setIsRunning(false);
      setActiveTest('');
    }
  };

  const exportTestReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      title: 'Phase 1 Optimization Suite Verification Report',
      timestamp: new Date().toISOString(),
      summary,
      results: testResults,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `phase1_test_report_${Date.now()}.json`);
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
              <span>PHASE 1 VERIFICATION & SCIENTIFIC TEST HARNESS</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Optimizer Test Suite & Unit Verification</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated deterministic test assertions covering PRNG reproducibility, parameter bounds, Random Search baseline, DE/rand/1/bin, GP Bayesian Optimization, NSGA-II non-dominated sorting, and constraint penalties.
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
              onClick={handleRunAllTests}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{isRunning ? `Running ${activeTest}...` : 'Run All Phase 1 Tests'}</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Strip */}
        {summary && (
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className={`p-3 rounded-lg border ${summary.passed === summary.total ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}>
              <div className="text-[10px] text-slate-400">TEST STATUS</div>
              <div className="text-lg font-bold mt-0.5">
                {summary.passed === summary.total ? '✓ ALL TESTS PASSED' : `${summary.total - summary.passed} FAILED`}
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
            <span>Phase 1 Verification Matrix (7 Test Suites)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {testResults.length} / 7 Executed
          </span>
        </div>

        {testResults.length === 0 && !isRunning ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono space-y-2">
            <FlaskConical className="w-8 h-8 text-cyan-400/50 mx-auto" />
            <div>No test results yet. Click "Run All Phase 1 Tests" to execute the scientific verification suite.</div>
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
