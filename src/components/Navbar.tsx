import React from 'react';
import { 
  Activity, 
  Cpu, 
  Play, 
  GitFork, 
  Sparkles, 
  Flame, 
  PlusCircle,
  RotateCcw,
  FlaskConical,
  ShieldCheck,
  Bot,
  Terminal,
  Radio,
  Server,
  Zap,
  Search
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'wizard' 
  | 'studio' 
  | 'run_details' 
  | 'pareto' 
  | 'benchmarks' 
  | 'surrogate' 
  | 'hitl'
  | 'rl'
  | 'autonomous'
  | 'audit'
  | 'ev_demo'
  | 'tests';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isRunning: boolean;
  activeRunName?: string;
  onResetDefaults?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  activeRunName,
  onResetDefaults,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#05090d]/95 backdrop-blur-md border-b border-[#49e6ff]/20 text-slate-100 shadow-2xl">
      {/* Top Telemetry Status Strip */}
      <div className="bg-[#03060a] border-b border-[#49e6ff]/10 px-4 py-1 text-[11px] font-mono flex items-center justify-between text-slate-400 overflow-x-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#62f6b4] animate-pulse"></span>
            <span className="text-slate-300 font-semibold tracking-wider uppercase">FORGEOS ENGINE v2.4</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1 text-[#49e6ff]">
            <Server className="w-3 h-3" />
            <span>COMPUTE ● 12/12 WORKERS</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1 text-[#62f6b4]">
            <Zap className="w-3 h-3" />
            <span>SIMULATORS ● 3/3 ONLINE</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1 text-[#a97bff]">
            <Sparkles className="w-3 h-3" />
            <span>GP SURROGATE ● VALIDATED (R² 0.94)</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-slate-400">
            <Radio className="w-3 h-3 text-[#62f6b4]" />
            <span>DATA FABRIC ● SECURE</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-slate-400">
            TIME LATENCY: <span className="text-[#62f6b4]">1.2ms</span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Console */}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Identity & Mission Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 rounded bg-[#0c1720] border border-[#49e6ff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(73,230,255,0.25)]">
              <Cpu className="w-4 h-4 text-[#49e6ff]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wider uppercase font-mono text-white">FORGEOS</span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#49e6ff]/10 text-[#49e6ff] border border-[#49e6ff]/30 font-semibold">
                  MISSION CONTROL
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">Autonomous Engineering Command System</p>
            </div>
          </div>

          {/* Mission Control Navigation Bar */}
          <nav className="hidden xl:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/50 shadow-[0_0_10px_rgba(73,230,255,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#49e6ff]" />
              <span>Command Center</span>
            </button>

            <button
              onClick={() => setActiveTab('wizard')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'wizard'
                  ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/50 shadow-[0_0_10px_rgba(73,230,255,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Problem</span>
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'studio'
                  ? 'bg-[#0c1720] text-[#62f6b4] border border-[#62f6b4]/50 shadow-[0_0_10px_rgba(98,246,180,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-[#62f6b4]" />
              <span>Optimization Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('pareto')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'pareto'
                  ? 'bg-[#0c1720] text-[#62f6b4] border border-[#62f6b4]/50 shadow-[0_0_10px_rgba(98,246,180,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-[#62f6b4]" />
              <span>Pareto Front</span>
            </button>

            <button
              onClick={() => setActiveTab('surrogate')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'surrogate'
                  ? 'bg-[#0c1720] text-[#a97bff] border border-[#a97bff]/50 shadow-[0_0_10px_rgba(169,123,255,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#a97bff]" />
              <span>Surrogate Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('hitl')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'hitl'
                  ? 'bg-[#0c1720] text-[#ffb84d] border border-[#ffb84d]/50 shadow-[0_0_10px_rgba(255,184,77,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#ffb84d]" />
              <span>HITL Steering</span>
            </button>

            <button
              onClick={() => setActiveTab('rl')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'rl'
                  ? 'bg-[#0c1720] text-[#a97bff] border border-[#a97bff]/50 shadow-[0_0_10px_rgba(169,123,255,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-[#a97bff]" />
              <span>RL Policy</span>
            </button>

            <button
              onClick={() => setActiveTab('autonomous')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'autonomous'
                  ? 'bg-[#0c1720] text-[#a97bff] border border-[#a97bff]/50 shadow-[0_0_10px_rgba(169,123,255,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#a97bff]" />
              <span>Autonomous Loop</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'benchmarks'
                  ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/50 shadow-[0_0_10px_rgba(73,230,255,0.2)]'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#49e6ff]" />
              <span>Validation Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'audit'
                  ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/50'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#49e6ff]" />
              <span>Merkle Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('ev_demo')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'ev_demo'
                  ? 'bg-[#0c1720] text-[#ffb84d] border border-[#ffb84d]/50'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#ffb84d]" />
              <span>EV Thermal Twin</span>
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono tracking-wide uppercase transition-all flex items-center space-x-1.5 ${
                activeTab === 'tests'
                  ? 'bg-[#0c1720] text-[#62f6b4] border border-[#62f6b4]/50'
                  : 'text-slate-400 hover:bg-[#081117] hover:text-slate-200 border border-transparent'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#62f6b4]" />
              <span>System Verification</span>
            </button>
          </nav>

          {/* Engine Status Badge & System Actions */}
          <div className="flex items-center space-x-3">
            {isRunning ? (
              <div className="flex items-center space-x-2 bg-[#0c1720] border border-[#62f6b4]/60 px-3 py-1 rounded text-xs text-[#62f6b4] font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#62f6b4]"></span>
                <span className="uppercase tracking-wider">RUNNING: {activeRunName || 'CAMPAIGN'}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2 bg-[#081117] border border-[#62f6b4]/30 px-3 py-1 rounded text-xs text-[#62f6b4] font-mono">
                <span className="w-2 h-2 rounded-full bg-[#62f6b4]"></span>
                <span className="uppercase tracking-wider">ENGINE ONLINE</span>
              </div>
            )}

            {onResetDefaults && (
              <button
                onClick={onResetDefaults}
                title="Reset workspace to factory presets"
                className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-[#081117] border border-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer Sub-Bar */}
      <div className="xl:hidden flex items-center overflow-x-auto px-4 py-2 space-x-2 border-t border-[#49e6ff]/10 bg-[#03060a] text-xs font-mono">
        <button onClick={() => setActiveTab('dashboard')} className={`px-2 py-1 rounded ${activeTab === 'dashboard' ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/40' : 'text-slate-400'}`}>Command Center</button>
        <button onClick={() => setActiveTab('wizard')} className={`px-2 py-1 rounded ${activeTab === 'wizard' ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/40' : 'text-slate-400'}`}>New Problem</button>
        <button onClick={() => setActiveTab('studio')} className={`px-2 py-1 rounded ${activeTab === 'studio' ? 'bg-[#0c1720] text-[#62f6b4] border border-[#62f6b4]/40' : 'text-slate-400'}`}>Studio</button>
        <button onClick={() => setActiveTab('pareto')} className={`px-2 py-1 rounded ${activeTab === 'pareto' ? 'bg-[#0c1720] text-[#62f6b4] border border-[#62f6b4]/40' : 'text-slate-400'}`}>Pareto</button>
        <button onClick={() => setActiveTab('surrogate')} className={`px-2 py-1 rounded ${activeTab === 'surrogate' ? 'bg-[#0c1720] text-[#a97bff] border border-[#a97bff]/40' : 'text-slate-400'}`}>Surrogate</button>
        <button onClick={() => setActiveTab('benchmarks')} className={`px-2 py-1 rounded ${activeTab === 'benchmarks' ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/40' : 'text-slate-400'}`}>Benchmarks</button>
        <button onClick={() => setActiveTab('audit')} className={`px-2 py-1 rounded ${activeTab === 'audit' ? 'bg-[#0c1720] text-[#49e6ff] border border-[#49e6ff]/40' : 'text-slate-400'}`}>Merkle Audit</button>
        <button onClick={() => setActiveTab('ev_demo')} className={`px-2 py-1 rounded ${activeTab === 'ev_demo' ? 'bg-[#0c1720] text-[#ffb84d] border border-[#ffb84d]/40' : 'text-slate-400'}`}>EV Twin</button>
        <button onClick={() => setActiveTab('tests')} className={`px-2 py-1 rounded ${activeTab === 'tests' ? 'bg-[#0c1720] text-[#62f6b4] border border-[#62f6b4]/40' : 'text-slate-400'}`}>Verification</button>
      </div>
    </header>
  );
};
