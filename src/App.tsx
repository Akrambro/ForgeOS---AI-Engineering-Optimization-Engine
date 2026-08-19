import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { OptimizationStudio } from './components/OptimizationStudio';
import { ProblemWizard } from './components/ProblemWizard';
import { RunDetailView } from './components/RunDetailView';
import { ParetoView } from './components/ParetoView';
import { BenchmarkView } from './components/BenchmarkView';
import { SurrogateLab } from './components/SurrogateLab';
import { EvThermalDemo } from './components/EvThermalDemo';
import { ExperimentAuditStudio } from './components/ExperimentAuditStudio';
import { HumanInTheLoopView } from './components/HumanInTheLoopView';
import { ReinforcementLearningView } from './components/ReinforcementLearningView';
import { AutonomousPipelineView } from './components/AutonomousPipelineView';
import { MasterTestRunner } from './components/Phase2TestRunner';
import { LocalDatabase } from './storage/db';
import { BENCHMARK_CATALOG } from './core/benchmarks/benchmarkSuite';
import { Problem, OptimizationRun } from './types';
import { fetchPhase01State } from './api/phase01Client';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [selectedRun, setSelectedRun] = useState<OptimizationRun | null>(null);

  // Initialize data on mount
  useEffect(() => {
    let cancelled = false;
    // 1. Seed benchmark problems if empty
    let loadedProblems = LocalDatabase.getProblems();
    if (loadedProblems.length === 0) {
      loadedProblems = BENCHMARK_CATALOG.map(b => b.problem);
      loadedProblems.forEach(p => LocalDatabase.saveProblem(p));
    }
    const loadedRuns = LocalDatabase.getRuns();
    setProblems(loadedProblems);
    setSelectedProblem(loadedProblems[0] || null);
    setRuns(loadedRuns);
    if (loadedRuns.length > 0) setSelectedRun(loadedRuns[0]);

    void fetchPhase01State().then(remoteState => {
      if (cancelled) return;
      const mergedProblems = [...remoteState.problems, ...loadedProblems.filter(problem => !remoteState.problems.some(remote => remote.id === problem.id))];
      const remoteRunIds = new Set(remoteState.runs.map(run => run.id));
      const mergedRuns = [...remoteState.runs, ...loadedRuns.filter(run => !remoteRunIds.has(run.id))];
      setProblems(mergedProblems);
      setSelectedProblem(current => current && mergedProblems.some(problem => problem.id === current.id) ? current : mergedProblems[0] || null);
      setRuns(mergedRuns);
      setSelectedRun(current => current && mergedRuns.some(run => run.id === current.id) ? current : mergedRuns[0] || null);
    }).catch(() => {
      // Local storage remains the honest fallback when the API is unavailable.
    });

    return () => { cancelled = true; };
  }, []);

  const handleSelectProblem = (problem: Problem) => {
    setSelectedProblem(problem);
  };

  const handleLaunchProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    setActiveTab('studio');
  };

  const handleRunFinished = (run: OptimizationRun) => {
    LocalDatabase.saveRun(run);
    setRuns(prev => [run, ...prev]);
    setSelectedRun(run);
  };

  const handleViewRunDetails = (run: OptimizationRun) => {
    setSelectedRun(run);
    const prob = problems.find(p => p.id === run.problemId);
    if (prob) setSelectedProblem(prob);
    setActiveTab('run_details');
  };

  const handleSaveNewProblem = (newProblem: Problem) => {
    LocalDatabase.saveProblem(newProblem);
    setProblems(prev => [newProblem, ...prev]);
    setSelectedProblem(newProblem);
    setActiveTab('studio');
  };

  const currentRunProblem = selectedRun
    ? problems.find(p => p.id === selectedRun.problemId) || selectedProblem || problems[0]
    : selectedProblem || problems[0];

  return (
    <div className="min-h-screen bg-[#05090d] text-slate-100 flex flex-col font-sans bg-command-grid selection:bg-[#49e6ff] selection:text-[#05090d]">
      {/* Top Fixed Engineering Navigation Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {activeTab === 'dashboard' && (
          <Dashboard
            problems={problems}
            runs={runs}
            onSelectProblem={handleSelectProblem}
            onLaunchProblem={handleLaunchProblem}
            onViewRunDetails={handleViewRunDetails}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'studio' && selectedProblem && (
          <OptimizationStudio
            problems={problems}
            selectedProblem={selectedProblem}
            onSelectProblem={handleSelectProblem}
            onRunFinished={handleRunFinished}
            onViewRunDetails={handleViewRunDetails}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'wizard' && (
          <ProblemWizard
            onSaveProblem={handleSaveNewProblem}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'run_details' && selectedRun && currentRunProblem && (
          <RunDetailView
            run={selectedRun}
            problem={currentRunProblem}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'pareto' && (
          <ParetoView runs={runs} problems={problems} />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarkView />
        )}

        {activeTab === 'surrogate' && (
          <SurrogateLab problems={problems} runs={runs} />
        )}

        {activeTab === 'hitl' && selectedProblem && (
          <HumanInTheLoopView 
            problem={selectedProblem} 
            onUpdateProblem={(p) => {
              LocalDatabase.saveProblem(p);
              setSelectedProblem(p);
            }} 
          />
        )}

        {activeTab === 'rl' && (
          <ReinforcementLearningView />
        )}

        {activeTab === 'autonomous' && (
          <AutonomousPipelineView />
        )}

        {activeTab === 'audit' && (
          <ExperimentAuditStudio problems={problems} />
        )}

        {activeTab === 'ev_demo' && (
          <EvThermalDemo onRunFinished={handleRunFinished} />
        )}

        {activeTab === 'tests' && (
          <MasterTestRunner />
        )}
      </main>

      {/* Engineering Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs font-mono text-slate-600">
        AI Engineering Optimization Engine • Deterministic PRNG Seeded • Non-Parametric GP Surrogate & Multi-Objective NSGA-II Suite
      </footer>
    </div>
  );
}
