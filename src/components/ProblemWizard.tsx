import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  Sliders, 
  Target, 
  ShieldAlert, 
  Code2, 
  PlayCircle,
  HelpCircle,
  FileCheck2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Problem, Variable, Objective, Constraint, EvaluationAdapterConfig } from '../types';
import { UniversalEvaluator } from '../core/evaluators/evaluator';

interface ProblemWizardProps {
  onSaveProblem: (problem: Problem) => void;
  onCancel: () => void;
}

export const ProblemWizard: React.FC<ProblemWizardProps> = ({ onSaveProblem, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [name, setName] = useState('Turbine Blade Cooling Optimization');
  const [description, setDescription] = useState('Optimizes blade internal film cooling hole geometry to minimize peak blade metal temperature and coolant mass flow.');
  const [category, setCategory] = useState<'mechanical' | 'thermal' | 'aerodynamics' | 'benchmark' | 'custom'>('thermal');

  const [variables, setVariables] = useState<Variable[]>([
    { id: 'v1', name: 'hole_diameter', type: 'continuous', lowerBound: 0.5, upperBound: 2.5, defaultValue: 1.2, unit: 'mm', description: 'Film hole drill diameter' },
    { id: 'v2', name: 'inclination_angle', type: 'continuous', lowerBound: 20.0, upperBound: 60.0, defaultValue: 35.0, unit: 'deg', description: 'Hole injection angle to surface' },
    { id: 'v3', name: 'blowing_ratio', type: 'continuous', lowerBound: 0.5, upperBound: 3.0, defaultValue: 1.5, unit: '', description: 'Coolant to freestream mass flux ratio' },
    { id: 'v4', name: 'hole_count', type: 'integer', lowerBound: 4, upperBound: 20, defaultValue: 12, unit: 'holes', description: 'Number of cooling holes per row' },
  ]);

  const [objectives, setObjectives] = useState<Objective[]>([
    { id: 'obj1', name: 'peak_metal_temp', direction: 'minimize', unit: 'K', description: 'Maximum turbine blade surface temperature' },
    { id: 'obj2', name: 'coolant_mass_flow', direction: 'minimize', unit: 'kg/s', description: 'Auxiliary compressor bleed coolant consumption' },
  ]);

  const [constraints, setConstraints] = useState<Constraint[]>([
    { id: 'c1', name: 'max_stress_concentration', operator: '<=', threshold: 2.8, unit: 'K_t', description: 'Hole edge stress concentration factor <= 2.8' },
    { id: 'c2', name: 'min_cooling_effectiveness', operator: '>=', threshold: 0.65, unit: 'eta', description: 'Adiabatic film effectiveness >= 0.65' },
  ]);

  const [adapterConfig, setAdapterConfig] = useState<EvaluationAdapterConfig>({
    type: 'python',
    simulatedDelayMs: 10,
    code: `// Deterministic turbine cooling physics proxy
const d = Number(params.hole_diameter ?? 1.2);
const angle = Number(params.inclination_angle ?? 35);
const M = Number(params.blowing_ratio ?? 1.5);
const N = Number(params.hole_count ?? 12);

// Film cooling effectiveness correlation (Goldstein & Eckert proxy)
const momentum_ratio = M * Math.sin(angle * Math.PI / 180);
const eta_film = Math.min(0.85, 0.45 * Math.pow(M, 0.7) * Math.cos(angle * Math.PI / 180) * Math.sqrt(d / 1.5));
const peak_temp = 1450.0 - 450.0 * eta_film + 12.0 * Math.max(0, momentum_ratio - 1.2);

// Coolant consumption
const coolant_flow = N * (Math.PI * Math.pow(d / 1000, 2) / 4) * M * 1.8;

// Mechanical stress concentration
const Kt = 2.0 + 0.4 * (d / 1.0) + 0.015 * Math.pow(angle - 30, 2) / 10;

return {
  objectives: {
    peak_metal_temp: Number(peak_temp.toFixed(1)),
    coolant_mass_flow: Number((coolant_flow * 1000).toFixed(3))
  },
  constraints: {
    max_stress_concentration: Number(Kt.toFixed(2)),
    min_cooling_effectiveness: Number(eta_film.toFixed(3))
  }
};`,
  });

  // Test Evaluation Result
  const [testResult, setTestResult] = useState<any>(null);
  const [testRunning, setTestRunning] = useState(false);

  const handleTestEvaluation = async () => {
    setTestRunning(true);
    const mockProblem: Problem = {
      id: 'test_temp',
      name,
      description,
      version: '1.0',
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variables,
      objectives,
      constraints,
      adapter: adapterConfig,
    };

    const evaluator = new UniversalEvaluator(mockProblem);
    const testParams: Record<string, any> = {};
    variables.forEach(v => {
      testParams[v.name] = v.defaultValue ?? (v.type === 'categorical' ? (v.choices?.[0] || 'default') : v.lowerBound);
    });

    const res = await evaluator.evaluate(testParams);
    setTestResult(res);
    setTestRunning(false);
  };

  const handleSave = () => {
    const newProblem: Problem = {
      id: `prob_${Date.now()}`,
      name,
      description,
      version: '1.0',
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variables,
      objectives,
      constraints,
      adapter: adapterConfig,
    };
    onSaveProblem(newProblem);
  };

  // Variable helpers
  const addVariable = () => {
    const id = `v_${Date.now()}`;
    setVariables([
      ...variables,
      { id, name: `var_${variables.length + 1}`, type: 'continuous', lowerBound: 0, upperBound: 10, defaultValue: 5, unit: '', description: '' },
    ]);
  };

  const updateVariable = (id: string, updates: Partial<Variable>) => {
    setVariables(variables.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  // Objective helpers
  const addObjective = () => {
    const id = `obj_${Date.now()}`;
    setObjectives([
      ...objectives,
      { id, name: `obj_${objectives.length + 1}`, direction: 'minimize', unit: '', description: '' },
    ]);
  };

  const updateObjective = (id: string, updates: Partial<Objective>) => {
    setObjectives(objectives.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteObjective = (id: string) => {
    setObjectives(objectives.filter(o => o.id !== id));
  };

  // Constraint helpers
  const addConstraint = () => {
    const id = `c_${Date.now()}`;
    setConstraints([
      ...constraints,
      { id, name: `constraint_${constraints.length + 1}`, operator: '<=', threshold: 100, unit: '', description: '' },
    ]);
  };

  const updateConstraint = (id: string, updates: Partial<Constraint>) => {
    setConstraints(constraints.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteConstraint = (id: string) => {
    setConstraints(constraints.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Define Engineering Problem</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure design parameters, mathematical objectives, physics constraints, and evaluation adapters.</p>
          </div>
          <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-200">
            Cancel
          </button>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-5 gap-2 mt-6">
          {[
            { num: 1, label: '1. Metadata', icon: Sliders },
            { num: 2, label: '2. Variables', icon: Sliders },
            { num: 3, label: '3. Objectives', icon: Target },
            { num: 4, label: '4. Constraints', icon: ShieldAlert },
            { num: 5, label: '5. Evaluator', icon: Code2 },
          ].map(s => {
            const Icon = s.icon;
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setStep(s.num as any)}
                className={`flex items-center space-x-2 p-2.5 rounded-lg text-xs font-medium border transition-all text-left ${
                  isCurrent
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                    : isDone
                    ? 'bg-slate-950 border-slate-800 text-emerald-400'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isDone ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-300'
                }`}>
                  {isDone ? '✓' : s.num}
                </div>
                <span className="truncate hidden sm:inline">{s.label.split('. ')[1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Step 1: Problem Identity</h3>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Problem Title</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                placeholder="e.g. Aerodynamic Wingtip Vortex Optimization"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Engineering Domain</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="thermal">Thermal & Heat Transfer</option>
                <option value="mechanical">Mechanical & Structural FEA</option>
                <option value="aerodynamics">Aerodynamics & CFD</option>
                <option value="benchmark">Scientific Benchmark</option>
                <option value="custom">Custom Engineering System</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Problem Formulation Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                placeholder="Describe physical variables, simulation assumptions, and target engineering criteria..."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Step 2: Design Variables</h3>
                <p className="text-xs text-slate-400">Specify parameter bounds, types (continuous, integer, categorical), and units.</p>
              </div>
              <button
                onClick={addVariable}
                className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variable</span>
              </button>
            </div>

            <div className="space-y-3">
              {variables.map((v, idx) => (
                <div key={v.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">NAME</label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={e => updateVariable(v.id, { name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">TYPE</label>
                      <select
                        value={v.type}
                        onChange={e => updateVariable(v.id, { type: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100"
                      >
                        <option value="continuous">Continuous</option>
                        <option value="integer">Integer</option>
                        <option value="categorical">Categorical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">LOWER BOUND</label>
                      <input
                        type="number"
                        value={v.lowerBound}
                        onChange={e => updateVariable(v.id, { lowerBound: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">UPPER BOUND</label>
                      <input
                        type="number"
                        value={v.upperBound}
                        onChange={e => updateVariable(v.id, { upperBound: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">UNIT</label>
                      <input
                        type="text"
                        value={v.unit}
                        onChange={e => updateVariable(v.id, { unit: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                        placeholder="e.g. mm, °C, RPM"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between gap-2">
                      <div className="w-full">
                        <label className="text-[10px] text-slate-400 font-mono">DESCRIPTION</label>
                        <input
                          type="text"
                          value={v.description}
                          onChange={e => updateVariable(v.id, { description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                        />
                      </div>
                      {variables.length > 1 && (
                        <button
                          onClick={() => deleteVariable(v.id)}
                          className="mt-4 p-1.5 rounded text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Step 3: Objectives</h3>
                <p className="text-xs text-slate-400">Define minimization or maximization targets (Single or Multi-Objective).</p>
              </div>
              <button
                onClick={addObjective}
                className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Objective</span>
              </button>
            </div>

            <div className="space-y-3">
              {objectives.map((obj, idx) => (
                <div key={obj.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">NAME</label>
                    <input
                      type="text"
                      value={obj.name}
                      onChange={e => updateObjective(obj.id, { name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">DIRECTION</label>
                    <select
                      value={obj.direction}
                      onChange={e => updateObjective(obj.id, { direction: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100"
                    >
                      <option value="minimize">Minimize</option>
                      <option value="maximize">Maximize</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">UNIT</label>
                    <input
                      type="text"
                      value={obj.unit}
                      onChange={e => updateObjective(obj.id, { unit: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-full">
                      <label className="text-[10px] text-slate-400 font-mono">DESCRIPTION</label>
                      <input
                        type="text"
                        value={obj.description}
                        onChange={e => updateObjective(obj.id, { description: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100"
                      />
                    </div>
                    {objectives.length > 1 && (
                      <button
                        onClick={() => deleteObjective(obj.id)}
                        className="mt-4 ml-2 p-1.5 rounded text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Step 4: Constraints</h3>
                <p className="text-xs text-slate-400">Strict physical, regulatory, or operational inequality / equality limits.</p>
              </div>
              <button
                onClick={addConstraint}
                className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Constraint</span>
              </button>
            </div>

            {constraints.length === 0 ? (
              <div className="p-6 bg-slate-950 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
                No constraints added. Problem is unconstrained.
              </div>
            ) : (
              <div className="space-y-3">
                {constraints.map((c, idx) => (
                  <div key={c.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">NAME</label>
                      <input
                        type="text"
                        value={c.name}
                        onChange={e => updateConstraint(c.id, { name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">OPERATOR</label>
                      <select
                        value={c.operator}
                        onChange={e => updateConstraint(c.id, { operator: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono font-bold"
                      >
                        <option value="<=">&le; (Less than or equal)</option>
                        <option value=">=">&ge; (Greater than or equal)</option>
                        <option value="==">== (Exact equality)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono">THRESHOLD VALUE</label>
                      <input
                        type="number"
                        value={c.threshold}
                        onChange={e => updateConstraint(c.id, { threshold: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-full">
                        <label className="text-[10px] text-slate-400 font-mono">DESCRIPTION</label>
                        <input
                          type="text"
                          value={c.description}
                          onChange={e => updateConstraint(c.id, { description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100"
                        />
                      </div>
                      <button
                        onClick={() => deleteConstraint(c.id)}
                        className="mt-4 ml-2 p-1.5 rounded text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Step 5: Evaluation Adapter & Code Sandbox</h3>
                <p className="text-xs text-slate-400">Implement evaluation code returning objective and constraint dictionaries.</p>
              </div>
              <button
                onClick={handleTestEvaluation}
                disabled={testRunning}
                className="inline-flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>{testRunning ? 'Evaluating...' : 'Test Evaluation Sandbox'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Adapter Type</label>
                <select
                  value={adapterConfig.type}
                  onChange={e => setAdapterConfig({ ...adapterConfig, type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  <option value="python">Python Script / Function Adapter</option>
                  <option value="cli">CLI Subprocess / Executable Command</option>
                  <option value="file_io">File I/O Deck (OpenFOAM / CalculiX / CSV)</option>
                  <option value="cfd">Airfoil CFD Aerodynamics Virtual Solver</option>
                  <option value="fea">Cantilever Structural FEA Virtual Solver</option>
                  <option value="ev_thermal">EV Thermal Powertrain Simulator</option>
                  <option value="builtin">Built-in Standard Benchmark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Simulated Latency (ms)</label>
                <input
                  type="number"
                  value={adapterConfig.simulatedDelayMs ?? 0}
                  onChange={e => setAdapterConfig({ ...adapterConfig, simulatedDelayMs: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                  placeholder="e.g. 50 (simulate expensive FEA/CFD)"
                />
              </div>
            </div>

            {adapterConfig.type === 'cli' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">CLI Command Template</label>
                <input
                  type="text"
                  value={adapterConfig.commandTemplate || 'openfoam_airfoil --camber={{camber | .4f}} --thickness={{thickness | .4f}} --aoa={{aoa | .2f}}'}
                  onChange={e => setAdapterConfig({ ...adapterConfig, commandTemplate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. airfoil_solver --aoa={{aoa}} --mach={{mach}}"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Use {'{{param_name}}'} or {'{{param_name | .4f}}'} for precision formatting.</p>
              </div>
            )}

            {(adapterConfig.type === 'python' || adapterConfig.type === 'file_io') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {adapterConfig.type === 'file_io' ? 'Input Deck Template / Configuration' : 'Adapter Function Body / Script'}
                </label>
                <textarea
                  rows={10}
                  value={adapterConfig.code}
                  onChange={e => setAdapterConfig({ ...adapterConfig, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
            )}

            {/* Test Sandbox Output */}
            {testResult && (
              <div className={`p-4 rounded-lg border text-xs font-mono space-y-2 ${
                testResult.status === 'successful' ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>Sandbox Test Result: {testResult.status.toUpperCase()}</span>
                  <span>Duration: {testResult.durationMs} ms</span>
                </div>
                {testResult.error && (
                  <div className="text-rose-400">Error: {testResult.error}</div>
                )}
                <div>
                  <span className="text-slate-400">Objectives: </span>
                  <span>{JSON.stringify(testResult.objectiveValues)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Constraints: </span>
                  <span>{JSON.stringify(testResult.constraintValues)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Feasible: </span>
                  <span className={testResult.feasible ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {testResult.feasible ? 'YES' : 'NO (Violates Constraints)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setStep((Math.max(1, step - 1) as any))}
            disabled={step === 1}
            className={`inline-flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 ${
              step === 1 ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep((Math.min(5, step + 1) as any))}
              className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-100 text-xs px-4 py-2 rounded-lg border border-slate-700 hover:border-cyan-800 font-medium"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2 rounded-lg shadow-sm"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Save & Register Problem</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
