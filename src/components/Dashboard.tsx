import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Flame, 
  Play, 
  PlusCircle, 
  Sparkles, 
  BarChart3, 
  ArrowRight, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Sliders,
  ChevronRight,
  TrendingDown,
  Cpu,
  Zap,
  Radio,
  Server,
  Crosshair,
  AlertTriangle,
  Compass,
  Gauge,
  Box,
  Binary
} from 'lucide-react';
import { Problem, OptimizationRun } from '../types';
import { BENCHMARK_CATALOG } from '../core/benchmarks/benchmarkSuite';
import { ActiveTab } from './Navbar';

interface DashboardProps {
  problems: Problem[];
  runs: OptimizationRun[];
  onSelectProblem: (problem: Problem) => void;
  onSelectRun?: (run: OptimizationRun) => void;
  onViewRunDetails?: (run: OptimizationRun) => void;
  onLaunchNewRun?: (problem: Problem) => void;
  onLaunchProblem?: (problem: Problem) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  problems,
  runs,
  onSelectProblem,
  onSelectRun,
  onViewRunDetails,
  onLaunchNewRun,
  onLaunchProblem,
  setActiveTab,
}) => {
  const handleLaunch = onLaunchProblem || onLaunchNewRun || (() => {});
  const handleViewDetails = onViewRunDetails || onSelectRun || (() => {});
  const [fieldMode, setFieldMode] = useState<'thermal' | 'flow' | 'pressure'>('thermal');
  const [selectedCandidate, setSelectedCandidate] = useState(121);

  // Aggregate Metrics
  const totalEvaluations = runs.reduce((acc, r) => acc + (r.trials?.length || 0), 0) || 1248;
  const completedRuns = runs.filter(r => r.status === 'completed');
  const activeRuns = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const feasibleEvaluations = runs.reduce((acc, r) => acc + (r.trials?.filter(t => t.feasible).length || 0), 0) || 1202;
  const feasibilityRate = totalEvaluations > 0 ? ((feasibleEvaluations / totalEvaluations) * 100).toFixed(1) : '96.3';
  const campaignState = activeRuns.length > 0 ? 'RUNNING' : 'READY';
  const campaignProgress = activeRuns[0]?.progress ?? 68;

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">

      {/* LAYER 1: COMMAND — ACTIVE CAMPAIGN TELEMETRY HERO BANNER */}
      <div className="bg-[#081117] border border-[#49e6ff]/30 rounded-md p-5 shadow-[0_0_25px_rgba(5,9,13,0.8)] relative overflow-hidden">
        {/* Top subtle scanline accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#49e6ff] via-[#62f6b4] to-[#a97bff]"></div>
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#62f6b4]/10 text-[#62f6b4] border border-[#62f6b4]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4] animate-ping"></span>
                <span className="font-bold tracking-wider uppercase">ACTIVE CAMPAIGN ● {campaignState} {campaignProgress}%</span>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-[#49e6ff] font-semibold">CAMPAIGN ID: EVT-024</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">ENGINE: BAYESIAN OPTIMIZATION + GAUSSIAN PROCESS</span>
            </div>
            
            <div className="flex items-center space-x-4 pt-1">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-white uppercase flex items-center space-x-3">
                <Flame className="w-6 h-6 text-[#ffb84d]" />
                <span>EV THERMAL SYSTEM v2 OPTIMIZATION</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono max-w-3xl">
              Simultaneous minimization of battery temperature max (34.2°C target) and coolant pump energy (1.79 kW) under max pressure constraint (&le; 2.5 bar).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('ev_demo')}
              className="px-4 py-2 bg-[#0c1720] hover:bg-[#122332] text-[#ffb84d] border border-[#ffb84d]/50 hover:border-[#ffb84d] rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-[0_0_12px_rgba(255,184,77,0.15)]"
            >
              <Flame className="w-4 h-4 text-[#ffb84d]" />
              <span>EV Twin Live Field</span>
            </button>
            <button
              onClick={() => setActiveTab('wizard')}
              className="px-4 py-2 bg-[#0c1720] hover:bg-[#122332] text-[#49e6ff] border border-[#49e6ff]/50 hover:border-[#49e6ff] rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-[0_0_12px_rgba(73,230,255,0.15)]"
            >
              <PlusCircle className="w-4 h-4 text-[#49e6ff]" />
              <span>New Problem Console</span>
            </button>
          </div>
        </div>

        {/* 5 Primary Engineering Metric Telemetry Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-4 border-t border-[#49e6ff]/15">
          <div className="bg-[#05090d]/80 border border-[#49e6ff]/20 p-3 rounded">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>EVALUATIONS</span>
              <Activity className="w-3.5 h-3.5 text-[#49e6ff]" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">{totalEvaluations}</div>
            <div className="text-[10px] font-mono text-[#62f6b4] mt-0.5">▲ 12% vs last 30 days</div>
          </div>

          <div className="bg-[#05090d]/80 border border-[#49e6ff]/20 p-3 rounded">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>FEASIBILITY RATE</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#62f6b4]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#62f6b4] tracking-tight">{feasibilityRate}%</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{feasibleEvaluations} feasible trials</div>
          </div>

          <div className="bg-[#05090d]/80 border border-[#49e6ff]/20 p-3 rounded">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>BEST IMPROVEMENT</span>
              <TrendingDown className="w-3.5 h-3.5 text-[#62f6b4]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#62f6b4] tracking-tight">27.3%</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">vs baseline design</div>
          </div>

          <div className="bg-[#05090d]/80 border border-[#49e6ff]/20 p-3 rounded">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>COMPUTE HOURS SAVED</span>
              <Zap className="w-3.5 h-3.5 text-[#49e6ff]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#49e6ff] tracking-tight">3,472</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">&asymp; 289 simulator hours</div>
          </div>

          <div className="bg-[#05090d]/80 border border-[#49e6ff]/20 p-3 rounded col-span-2 md:col-span-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>CONVERGENCE STATUS</span>
              <span className="w-2 h-2 rounded-full bg-[#62f6b4] animate-pulse"></span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#62f6b4] tracking-tight">STABLE</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">Confidence: 92% (dHV &lt; 0.001)</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#49e6ff]/15 pt-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3 font-mono text-[10px]">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#a97bff]" />
            <div>
              <div className="uppercase tracking-wider text-[#a97bff]">AI DECISION TRACE / CANDIDATE #{selectedCandidate}</div>
              <p className="mt-1 max-w-3xl text-slate-400">Expected improvement is high while predicted pressure remains below the constraint boundary. The candidate also samples an under-observed coolant-flow region.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
            <div className="border border-slate-800 bg-[#05090d] px-2 py-1.5"><span className="block text-slate-500">EI SCORE</span><b className="text-[#62f6b4]">0.084</b></div>
            <div className="border border-slate-800 bg-[#05090d] px-2 py-1.5"><span className="block text-slate-500">RISK</span><b className="text-[#62f6b4]">LOW</b></div>
            <div className="border border-slate-800 bg-[#05090d] px-2 py-1.5"><span className="block text-slate-500">CONFIDENCE</span><b className="text-[#49e6ff]">91%</b></div>
          </div>
        </div>
      </div>

      {/* LAYER 2: INTELLIGENCE & PHYSICS — PRIMARY 2-COLUMN COMMAND MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT & CENTER COLUMNS (2 Spans): Optimization Convergence & Search Space */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Optimization Convergence & AI Confidence Graph */}
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2.5">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-[#49e6ff]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">OPTIMIZATION CONVERGENCE & SURROGATE BAND</h2>
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-[#62f6b4]/10 text-[#62f6b4] border border-[#62f6b4]/30">● Best Observed</span>
                <span className="px-2 py-0.5 rounded bg-[#49e6ff]/10 text-[#49e6ff] border border-[#49e6ff]/30">-- Predicted Best</span>
                <span className="px-2 py-0.5 rounded bg-[#a97bff]/10 text-[#a97bff] border border-[#a97bff]/30">░ 95% Confidence</span>
              </div>
            </div>

            {/* Visual Convergence Chart Wireframe */}
            <div className="h-44 w-full bg-[#05090d] border border-slate-800 rounded p-3 relative flex flex-col justify-between font-mono text-[10px] text-slate-500">
              {/* Y-Axis Guidelines */}
              <div className="border-b border-slate-800/60 pb-1 flex justify-between"><span>Objective Score (Normalized)</span><span>1.00</span></div>
              <div className="border-b border-slate-800/40 pb-1 flex justify-between"><span></span><span>0.75</span></div>
              <div className="border-b border-slate-800/40 pb-1 flex justify-between"><span></span><span>0.50</span></div>
              <div className="border-b border-slate-800/40 pb-1 flex justify-between"><span></span><span>0.25</span></div>
              <div className="flex justify-between text-slate-400"><span>0 (Start)</span><span>Iteration 30</span><span>Iteration 60</span><span>Iteration 90</span><span>Iteration 121 (Current)</span></div>

              {/* Simulated Curve Lines SVG */}
              <svg className="absolute inset-0 w-full h-full p-3 overflow-visible pointer-events-none" viewBox="0 0 500 150">
                {/* 95% Confidence Ribbon Fill */}
                <path d="M 10 30 Q 120 70, 250 110 T 490 125 L 490 135 Q 250 120, 120 85 Z" fill="rgba(169, 123, 255, 0.12)" />
                {/* Baseline */}
                <line x1="10" y1="35" x2="490" y2="35" stroke="#ff5964" strokeDasharray="4 4" strokeWidth="1.5" />
                {/* GP Predicted */}
                <path d="M 10 30 Q 120 75, 250 115 T 490 130" fill="none" stroke="#49e6ff" strokeDasharray="3 3" strokeWidth="1.5" />
                {/* Best Observed (Solid Mint) */}
                <path d="M 10 40 L 40 50 L 70 75 L 110 82 L 160 102 L 210 112 L 280 120 L 350 124 L 420 127 L 490 128" fill="none" stroke="#62f6b4" strokeWidth="2.5" />
                {/* Current Best Point Highlight */}
                <circle cx="490" cy="128" r="4" fill="#62f6b4" stroke="#05090d" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Convergence Telemetry Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-[#05090d] border border-slate-800 p-2 rounded">
                <span className="text-slate-400 text-[10px] block">CURRENT BEST SCORE</span>
                <span className="text-[#62f6b4] font-bold">0.1842</span>
              </div>
              <div className="bg-[#05090d] border border-slate-800 p-2 rounded">
                <span className="text-slate-400 text-[10px] block">PREDICTED OPTIMUM</span>
                <span className="text-[#49e6ff] font-bold">0.1620</span>
              </div>
              <div className="bg-[#05090d] border border-slate-800 p-2 rounded">
                <span className="text-slate-400 text-[10px] block">UNCERTAINTY (&sigma;)</span>
                <span className="text-[#a97bff] font-bold">0.0621</span>
              </div>
              <div className="bg-[#05090d] border border-slate-800 p-2 rounded">
                <span className="text-slate-400 text-[10px] block">EST. TIME REMAINING</span>
                <span className="text-[#ffb84d] font-bold">00:14:22</span>
              </div>
            </div>
          </div>

          {/* 3D SEARCH SPACE & UNCERTAINTY MAP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Search Space Scatter Map */}
            <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-[#a97bff]" />
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">AI SEARCH SPACE</h3>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Acquisition field / live proposal</span>
                  </div>
                </div>
              </div>

              {/* Simulated Scatter Box */}
              <div className="h-40 bg-[#05090d] border border-slate-800 rounded relative p-2 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-command-grid opacity-60"></div>
                
                <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(ellipse at 68% 38%, rgba(98,246,180,.18), transparent 24%), radial-gradient(ellipse at 30% 72%, rgba(73,230,255,.14), transparent 30%)' }}></div>
                <div className="absolute top-[20%] left-[25%] h-2 w-2 rounded-full bg-[#62f6b4]"></div>
                <button onClick={() => setSelectedCandidate(120)} className="absolute top-[35%] left-[60%] h-2.5 w-2.5 rounded-full bg-[#49e6ff] shadow-[0_0_8px_#49e6ff]" aria-label="Select candidate 120"></button>
                <button onClick={() => setSelectedCandidate(121)} className="absolute top-[70%] left-[45%] h-3 w-3 rounded-full bg-[#ffb84d] shadow-[0_0_8px_#ffb84d] animate-pulse" aria-label="Select candidate 121"></button>
                <div className="absolute top-[50%] left-[80%] h-2 w-2 rounded-full bg-[#a97bff]"></div>
                <div className="absolute top-[80%] left-[20%] h-2 w-2 rounded-full bg-slate-600"></div>
                <div className="absolute bottom-[22%] right-[20%] h-14 w-20 rotate-[-18deg] border-b border-r border-[#62f6b4]/60"></div>

                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 bg-[#05090d]/90 px-2 py-0.5 rounded border border-slate-800">
                  X1: Inlet Temp | X2: Flow Rate
                </div>
                <div className="absolute top-2 right-2 text-[10px] font-mono text-[#ffb84d] bg-[#05090d]/90 px-2 py-0.5 rounded border border-[#ffb84d]/40">
                  <span className="text-[#62f6b4]">● Candidate #{selectedCandidate}</span> SELECTED
                </div>
              </div>

              <div className="flex items-center justify-between border border-[#ffb84d]/25 bg-[#05090d] px-2 py-1.5 font-mono text-[10px]">
                <span className="text-slate-400">NEXT ACTION</span>
                <span className="text-[#ffb84d]">SIMULATING CANDIDATE #{selectedCandidate}</span>
              </div>

              {/* AI Strategy Breakdown */}
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>EXPLORATION RATIO</span>
                  <span className="text-[#49e6ff]">78%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                  <div className="h-full bg-[#49e6ff] w-[78%]"></div>
                </div>

                <div className="flex justify-between text-slate-400 pt-1">
                  <span>EXPLOITATION RATIO</span>
                  <span className="text-[#62f6b4]">54%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                  <div className="h-full bg-[#62f6b4] w-[54%]"></div>
                </div>
              </div>
            </div>

            {/* DIGITAL TWIN PHYSICAL MODEL VISUALIZER */}
            <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-[#ffb84d]" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">DIGITAL TWIN PHYSICAL SCHEMATIC</h3>
                </div>
                <div className="flex border border-slate-800 bg-[#05090d] p-0.5 font-mono text-[9px] uppercase">
                  {(['thermal', 'flow', 'pressure'] as const).map(mode => (
                    <button key={mode} onClick={() => setFieldMode(mode)} className={`px-1.5 py-1 ${fieldMode === mode ? 'bg-[#ffb84d]/15 text-[#ffb84d]' : 'text-slate-500 hover:text-slate-300'}`}>{mode}</button>
                  ))}
                </div>
              </div>

              {/* Thermal Field Diagram */}
              <div className="h-40 bg-[#05090d] border border-slate-800 rounded relative p-3 flex flex-col justify-between font-mono text-[10px]">
                <div className="flex justify-between text-slate-400">
                  <span className="text-[#ffb84d]">EV BATTERY MODULE / {fieldMode.toUpperCase()} FIELD</span>
                  <span className="text-[#62f6b4]">COOLANT FLOW: 18.2 L/min</span>
                </div>

                <div className="relative flex items-center justify-between gap-2 border border-[#49e6ff]/30 bg-[#081117]/90 p-2">
                  <div className="absolute left-[18%] right-[18%] top-1/2 h-px bg-[#49e6ff]/50"></div>
                  <div className="z-10 w-[30%] border border-[#49e6ff]/40 bg-[#0c1720] p-2 text-center">
                    <span className="block text-[9px] text-slate-400">COOLANT INLET</span><strong className="text-[#49e6ff]">18.0 °C</strong>
                  </div>
                  <div className={`z-10 flex h-16 w-[36%] items-center justify-center border bg-[#0c1720] text-center ${fieldMode === 'thermal' ? 'border-[#ff5964]/70 shadow-[inset_0_0_18px_rgba(255,89,100,.22)]' : fieldMode === 'flow' ? 'border-[#49e6ff]/70 shadow-[inset_0_0_18px_rgba(73,230,255,.2)]' : 'border-[#a97bff]/70 shadow-[inset_0_0_18px_rgba(169,123,255,.2)]'}`}>
                    <span><span className="block text-[9px] text-slate-400">BATTERY PACK</span><strong className="text-white">42.7 °C</strong></span>
                  </div>
                  <div className="z-10 w-[30%] border border-[#62f6b4]/40 bg-[#0c1720] p-2 text-center"><span className="block text-[9px] text-slate-400">INVERTER / MOTOR</span><strong className="text-[#62f6b4]">NOMINAL</strong></div>
                </div>

                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>PUMP ENERGY: 1.79 kW</span>
                  <span>TOTAL MASS: 18.2 kg</span>
                </div>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px] bg-[#05090d] p-2 rounded border border-slate-800">
                <span className="text-slate-400">FEASIBILITY STATUS</span>
                <span className="text-[#62f6b4] font-bold">100% FEASIBLE</span>
              </div>
            </div>

          </div>

          {/* SIMULATOR ADAPTERS MATRIX */}
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-[#49e6ff]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">SIMULATION FABRIC & EXTERNAL ADAPTERS</h3>
              </div>
              <span className="text-[10px] font-mono text-[#62f6b4]">5 ADAPTERS ACTIVE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
              <div className="bg-[#05090d] border border-[#62f6b4]/30 p-2.5 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Ansys Fluent</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4]"></span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">v2024 R2 ● CFD</div>
                <div className="text-[9px] text-[#62f6b4] mt-0.5">CONNECTED</div>
              </div>

              <div className="bg-[#05090d] border border-[#62f6b4]/30 p-2.5 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">STAR-CCM+</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4]"></span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">v16.04 ● Thermal</div>
                <div className="text-[9px] text-[#62f6b4] mt-0.5">CONNECTED</div>
              </div>

              <div className="bg-[#05090d] border border-[#62f6b4]/30 p-2.5 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Abaqus</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4]"></span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">v2024 ● Structural</div>
                <div className="text-[9px] text-[#62f6b4] mt-0.5">CONNECTED</div>
              </div>

              <div className="bg-[#05090d] border border-[#62f6b4]/30 p-2.5 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">OpenFOAM</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4]"></span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">v11 ● Aero</div>
                <div className="text-[9px] text-[#62f6b4] mt-0.5">CONNECTED</div>
              </div>

              <div className="bg-[#05090d] border border-[#62f6b4]/30 p-2.5 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">COMSOL</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4]"></span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">v6.1 ● Multiphysics</div>
                <div className="text-[9px] text-[#62f6b4] mt-0.5">CONNECTED</div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (1 Span): Experiments Queue, Benchmark Fabric & Activity Stream */}
        <div className="space-y-5">
          
          {/* NEXT EXPERIMENTS QUEUE */}
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#ffb84d]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">NEXT EXPERIMENTS QUEUE</h3>
              </div>
              <span className="text-[10px] font-mono text-[#ffb84d] bg-[#ffb84d]/10 px-2 py-0.5 rounded border border-[#ffb84d]/30">4 QUEUED</span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 bg-[#05090d] border border-slate-800 rounded space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#49e6ff]">EXP-01249</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-[#ffb84d]/10 text-[#ffb84d] rounded border border-[#ffb84d]/30">HIGH PRIORITY</span>
                </div>
                <p className="text-[10px] text-slate-400">Inlet Temp = 18°C, Flow Rate = High</p>
              </div>

              <div className="p-2.5 bg-[#05090d] border border-slate-800 rounded space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#a97bff]">EXP-01250</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-[#a97bff]/10 text-[#a97bff] rounded border border-[#a97bff]/30">HIGH UNCERTAINTY</span>
                </div>
                <p className="text-[10px] text-slate-400">Microchannel Offset = 1.1mm</p>
              </div>

              <div className="p-2.5 bg-[#05090d] border border-slate-800 rounded space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#62f6b4]">EXP-01251</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-[#62f6b4]/10 text-[#62f6b4] rounded border border-[#62f6b4]/30">DIVERSE EXPLORATION</span>
                </div>
                <p className="text-[10px] text-slate-400">Coolant mixture = 40% EG</p>
              </div>
            </div>
          </div>

          {/* BENCHMARK FABRIC INSTRUMENTS */}
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#49e6ff]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">VALIDATION BENCHMARKS</h3>
              </div>
              <button onClick={() => setActiveTab('benchmarks')} className="text-[10px] font-mono text-[#49e6ff] hover:underline flex items-center space-x-1">
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div 
                onClick={() => setActiveTab('benchmarks')}
                className="bg-[#05090d] hover:bg-[#0c1720] border border-slate-800 hover:border-[#49e6ff]/40 p-2.5 rounded cursor-pointer transition-all"
              >
                <span className="font-bold text-slate-200 block">HEAT EXCHANGER</span>
                <span className="text-slate-400 block mt-0.5">Design Benchmark</span>
                <span className="text-[#62f6b4] font-bold block mt-1">ERR: 2.31%</span>
              </div>

              <div 
                onClick={() => setActiveTab('benchmarks')}
                className="bg-[#05090d] hover:bg-[#0c1720] border border-slate-800 hover:border-[#49e6ff]/40 p-2.5 rounded cursor-pointer transition-all"
              >
                <span className="font-bold text-slate-200 block">WING SEARCH</span>
                <span className="text-slate-400 block mt-0.5">Aero Benchmark</span>
                <span className="text-[#62f6b4] font-bold block mt-1">ERR: 1.87%</span>
              </div>

              <div 
                onClick={() => setActiveTab('benchmarks')}
                className="bg-[#05090d] hover:bg-[#0c1720] border border-slate-800 hover:border-[#49e6ff]/40 p-2.5 rounded cursor-pointer transition-all"
              >
                <span className="font-bold text-slate-200 block">BATTERY COOLING</span>
                <span className="text-slate-400 block mt-0.5">Thermal Benchmark</span>
                <span className="text-[#62f6b4] font-bold block mt-1">ERR: 2.94%</span>
              </div>

              <div 
                onClick={() => setActiveTab('benchmarks')}
                className="bg-[#05090d] hover:bg-[#0c1720] border border-slate-800 hover:border-[#49e6ff]/40 p-2.5 rounded cursor-pointer transition-all"
              >
                <span className="font-bold text-slate-200 block">TURBINE BLADE</span>
                <span className="text-slate-400 block mt-0.5">Structural Benchmark</span>
                <span className="text-[#62f6b4] font-bold block mt-1">ERR: 1.23%</span>
              </div>
            </div>
          </div>

          {/* LIVE ENGINEERING ACTIVITY STREAM */}
          <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-2">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[#62f6b4]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">ENGINEERING ACTIVITY STREAM</h3>
              </div>
            </div>

            <div className="space-y-2 font-mono text-[10px]">
              <div className="flex items-start space-x-2 text-slate-300">
                <span className="text-[#62f6b4] font-bold">22:14:07</span>
                <span className="text-slate-600">●</span>
                <span>Candidate <span className="text-[#62f6b4]">#121</span> selected <span className="text-slate-500">/</span> reason: high expected improvement + low constraint risk <span className="text-[#ffb84d]">(8.4% / 91% confidence)</span></span>
              </div>

              <div className="flex items-start space-x-2 text-slate-300">
                <span className="text-[#a97bff] font-bold">22:13:58</span>
                <span className="text-slate-600">●</span>
                <span>Gaussian Process surrogate model retrained (R² 0.94)</span>
              </div>

              <div className="flex items-start space-x-2 text-slate-300">
                <span className="text-[#49e6ff] font-bold">22:12:31</span>
                <span className="text-slate-600">●</span>
                <span>Experiment <span className="text-[#49e6ff]">#120</span> completed in Ansys Fluent (1.2s)</span>
              </div>

              <div className="flex items-start space-x-2 text-slate-300">
                <span className="text-[#ffb84d] font-bold">22:12:28</span>
                <span className="text-slate-600">▲</span>
                <span>Constraint boundary discovered (&le; 2.5 bar pressure)</span>
              </div>

              <div className="flex items-start space-x-2 text-slate-300">
                <span className="text-[#62f6b4] font-bold">22:11:43</span>
                <span className="text-slate-600">●</span>
                <span>Pareto frontier updated (4 non-dominated solutions)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* AVAILABLE PROBLEMS CATALOG SECTION */}
      <div className="bg-[#081117] border border-[#49e6ff]/20 rounded p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#49e6ff]/10 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#49e6ff]" />
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">ENGINEERING PROBLEM FABRIC</h2>
              <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wider text-slate-500">Versioned design spaces / benchmark instruments</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('wizard')}
            className="text-xs text-[#49e6ff] hover:underline font-mono flex items-center space-x-1"
          >
            <span>Problem Definition Console</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {problems.map((prob) => {
            const runCount = runs.filter(r => r.problemId === prob.id).length;
            return (
              <div
                key={prob.id}
                className="bg-[#05090d] border border-slate-800 hover:border-[#49e6ff]/50 rounded p-3.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="mb-3 h-16 border border-slate-800/80 bg-[radial-gradient(circle_at_50%_50%,rgba(98,246,180,.25),transparent_25%),linear-gradient(135deg,rgba(73,230,255,.08),transparent_55%)] relative overflow-hidden">
                    <div className="absolute inset-x-4 top-1/2 h-px bg-[#49e6ff]/30"></div>
                    <div className="absolute left-1/2 top-1/2 h-8 w-14 -translate-x-1/2 -translate-y-1/2 border border-[#62f6b4]/50"></div>
                    <span className="absolute bottom-1 left-2 text-[8px] font-mono uppercase tracking-wider text-slate-500">{prob.category || 'general'} / field preview</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold font-mono text-xs text-slate-100 truncate">{prob.name}</h3>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#49e6ff]/10 text-[#49e6ff] border border-[#49e6ff]/30">
                      {prob.category || 'GENERAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1.5 line-clamp-2 leading-relaxed">{prob.description}</p>

                  <div className="mt-3 flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                    <span>{prob.variables.length} VARS</span>
                    <span>•</span>
                    <span>{prob.objectives.length} OBJS</span>
                    <span>•</span>
                    <span>{prob.constraints.length} CONSTR</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">{runCount} RUNS LOGGED</span>
                  <button
                    onClick={() => {
                      onSelectProblem(prob);
                      onLaunchNewRun(prob);
                    }}
                    className="inline-flex items-center space-x-1 bg-[#0c1720] hover:bg-[#122332] text-[#62f6b4] border border-[#62f6b4]/40 text-[11px] font-mono font-bold px-2.5 py-1 rounded transition-colors"
                  >
                    <Play className="w-3 h-3 text-[#62f6b4]" />
                    <span>LAUNCH</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
