import React, { useState } from 'react';
import {
  Activity, Box, ChevronDown, Cpu, FlaskConical, Layers, Play,
  RotateCcw, Search, Server, ShieldCheck, Sparkles, Zap,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard' | 'wizard' | 'studio' | 'run_details' | 'pareto'
  | 'benchmarks' | 'surrogate' | 'hitl' | 'rl' | 'autonomous'
  | 'audit' | 'ev_demo' | 'tests';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isRunning?: boolean;
  activeRunName?: string;
  onResetDefaults?: () => void;
}

type NavItem = { id: ActiveTab; label: string; status?: string };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const navGroups: NavGroup[] = [
  { label: 'Command', icon: Activity, items: [{ id: 'dashboard', label: 'Campaign overview' }, { id: 'wizard', label: 'New problem' }] },
  { label: 'Optimize', icon: Play, items: [{ id: 'studio', label: 'Optimization runs' }, { id: 'pareto', label: 'Pareto explorer' }] },
  { label: 'Simulate', icon: Box, items: [{ id: 'ev_demo', label: 'EV digital twin' }, { id: 'benchmarks', label: 'Simulator adapters' }] },
  { label: 'Experiment', icon: FlaskConical, items: [{ id: 'audit', label: 'Experiment audit' }, { id: 'hitl', label: 'HIL steering', status: 'Experimental' }] },
  { label: 'Models', icon: Sparkles, items: [{ id: 'surrogate', label: 'Surrogate lab' }, { id: 'rl', label: 'RL policy', status: 'Experimental' }, { id: 'autonomous', label: 'Autonomous loop', status: 'Experimental' }] },
  { label: 'Validate', icon: ShieldCheck, items: [{ id: 'tests', label: 'System verification' }] },
];

interface NavMenuProps {
  group: NavGroup;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  open: boolean;
  setOpen: (label: string | null) => void;
}

const NavMenu: React.FC<NavMenuProps> = ({ group, activeTab, setActiveTab, open, setOpen }) => {
  const Icon = group.icon;
  const isActive = group.items.some(item => item.id === activeTab);

  return (
    <div className="relative">
      <button onClick={() => setOpen(open ? null : group.label)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.12em] transition-colors ${isActive ? 'border-[#49e6ff] text-[#49e6ff]' : 'border-transparent text-slate-400 hover:text-slate-100'}`}>
        <Icon className="h-3.5 w-3.5" /><span>{group.label}</span><ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] border border-slate-700 bg-[#0a141b] p-1 shadow-2xl">
        {group.items.map(item => <button key={item.id} onClick={() => { setActiveTab(item.id); setOpen(null); }} className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-mono transition-colors ${activeTab === item.id ? 'bg-[#10232b] text-[#62f6b4]' : 'text-slate-300 hover:bg-[#0e1c24] hover:text-white'}`}>
          <span>{item.label}</span>{item.status && <span className="ml-3 text-[9px] uppercase tracking-wider text-[#ffb84d]">{item.status}</span>}
        </button>)}
      </div>}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isRunning = false, activeRunName, onResetDefaults }) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return <header className="sticky top-0 z-50 border-b border-[#49e6ff]/15 bg-[#05090d]/95 text-slate-100 backdrop-blur-md">
    <div className="flex items-center justify-between gap-4 border-b border-[#49e6ff]/10 bg-[#03060a] px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 sm:px-6">
      <div className="flex items-center gap-4 whitespace-nowrap">
        <span className="flex items-center gap-2 font-bold text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-[#62f6b4]" />FORGEOS / ENGINE v2.4</span>
        <span className="hidden items-center gap-1.5 text-[#49e6ff] md:flex"><Server className="h-3 w-3" />COMPUTE 12/12</span>
        <span className="hidden items-center gap-1.5 text-[#62f6b4] lg:flex"><Zap className="h-3 w-3" />SIMULATORS 3/3</span>
        <span className="hidden items-center gap-1.5 text-slate-400 xl:flex"><Layers className="h-3 w-3" />DATA FABRIC SECURE</span>
      </div><span className="hidden sm:block">LATENCY <b className="text-[#62f6b4]">1.2ms</b></span>
    </div>
    <div className="mx-auto flex h-16 max-w-[1750px] items-center justify-between gap-4 px-4 sm:px-6">
      <button onClick={() => setActiveTab('dashboard')} className="flex min-w-0 items-center gap-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#49e6ff]/40 bg-[#0c1720] text-[#49e6ff]"><Cpu className="h-4 w-4" /></span>
        <span className="min-w-0"><span className="block font-mono text-sm font-bold tracking-[0.18em] text-white">FORGEOS</span><span className="hidden truncate text-[9px] font-mono uppercase tracking-wider text-slate-500 sm:block">AI engineering optimization engine</span></span>
      </button>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
        {navGroups.map(group => <NavMenu key={group.label} group={group} activeTab={activeTab} setActiveTab={setActiveTab} open={openGroup === group.label} setOpen={setOpenGroup} />)}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button title="Search workspace" className="hidden border border-slate-800 p-2 text-slate-400 hover:text-white sm:block"><Search className="h-4 w-4" /></button>
        <div className={`flex items-center gap-2 border px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider ${isRunning ? 'border-[#62f6b4]/60 text-[#62f6b4]' : 'border-slate-800 text-slate-400'}`}><span className="h-1.5 w-1.5 rounded-full bg-[#62f6b4]" /><span className="hidden sm:inline">{isRunning ? `RUNNING ${activeRunName || 'CAMPAIGN'}` : 'ENGINE ONLINE'}</span></div>
        {onResetDefaults && <button onClick={onResetDefaults} title="Reset workspace to factory presets" className="border border-slate-800 p-2 text-slate-400 hover:text-white"><RotateCcw className="h-4 w-4" /></button>}
      </div>
    </div>
    <nav className="flex gap-1 overflow-x-auto border-t border-[#49e6ff]/10 bg-[#03060a] px-4 py-2 lg:hidden" aria-label="Mobile navigation">
      {navGroups.map(group => group.items.map(item => <button key={item.id} onClick={() => setActiveTab(item.id)} className={`whitespace-nowrap px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider ${activeTab === item.id ? 'bg-[#10232b] text-[#49e6ff]' : 'text-slate-500'}`}>{group.label}: {item.label}</button>))}
    </nav>
  </header>;
};
