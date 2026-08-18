# FORGEOS / OptimaX Core — Engineering Command Center Design System

## Executive Design Vision
Transform the OptimaX Core application from a standard B2B SaaS dashboard into a high-density, futuristic industrial engineering command center inspired by **aerospace mission control**, **Formula 1 telemetry workstations**, and **advanced scientific computing software**.

The system presents a live, thinking autonomous engineering optimization engine where computation, surrogate reasoning, and physics simulation are exposed in real time.

---

## 1. Core Visual Layer Architecture

The interface is structured into three simultaneous visual layers:

### Layer 1: COMMAND (Operational Control & Campaign Telemetry)
- **Purpose**: Displays active campaign execution state, system status, live worker count, experiment queue, and system alerts.
- **Key Visual Elements**:
  - Live Campaign Telemetry Banner (`EV THERMAL SYSTEM v2` / `EVT-024` - 68% Progress).
  - High-impact engineering hero metrics (Evaluations, Feasibility %, Optimization Improvement %, Compute Hours Saved).
  - Persistent System Telemetry Bar (`COMPUTE ● 12/12`, `SIMULATORS ● 3/3`, `DATA ● HEALTHY`, `MODEL ● VALIDATED`).
  - Real-time Engineering Activity Stream (timestamped events log).

### Layer 2: INTELLIGENCE (AI & Optimization Reasoning)
- **Purpose**: Visualizes why the AI optimizer is taking specific actions, its search strategy, surrogate model state, and candidate generation logic.
- **Key Visual Elements**:
  - Search Space & Uncertainty Projection (2D/3D scatter matrix of observed, predicted, queued, and high-uncertainty candidate points).
  - AI Cognition Search State (Exploration %, Exploitation %, Model Confidence %, Constraint Boundary Confidence %).
  - Acquisition function & Gaussian Process surrogate uncertainty confidence intervals (95% CI bands).
  - Pareto Front Trade-off Matrix (Multi-objective optimization frontier with TOPSIS decision scoring).

### Layer 3: PHYSICS (Engineering Domain & Physical Constraints)
- **Purpose**: Displays physical variables, simulation field visualizations, constraint bounds, and physical measurements.
- **Key Visual Elements**:
  - Digital Twin Schematic & Thermal/Stress Field Visualizer (EV Battery/Coolant flow diagram with heat-map contour highlights).
  - Simulator Adapter Status Matrix (Ansys Fluent, STAR-CCM+, Abaqus, OpenFOAM, COMSOL with live connection telemetry).
  - Domain-Aware Physical Benchmarks (Heat Exchanger, Wing Aerodynamics, Battery Thermal, Turbine Structural design instruments).

---

## 2. Color Palette & Tactical Signal System

| Layer / Subsystem | Hex Code | Purpose / Visual Signal |
| :--- | :--- | :--- |
| **Canvas Base** | `#05090D` | Ultra-deep near-black canvas background |
| **Primary Panel** | `#081117` | Translucent technical panel fill |
| **Secondary Panel** | `#0C1720` | Subtle contrast panel fill |
| **Panel Border** | `rgba(73, 230, 255, 0.15)` | Hairline 1px technical border |
| **Simulation / Primary Signal** | `#49E6FF` | Electric Cyan (Active telemetry, primary highlights) |
| **Optimization Signal** | `#62F6B4` | Neon Mint / Green (Best observed, convergence, Pareto optimal) |
| **AI / ML / Surrogate Signal**| `#A97BFF` | Technical Violet (Surrogate models, acquisition, GP predictions) |
| **Warning / Constraints** | `#FFB84D` | Tactical Amber (Constraint boundaries, high uncertainty) |
| **Failure / Emergency Alert** | `#FF5964` | Red-Orange (Numerical failures, simulator crashes, timeouts) |

---

## 3. Structural Layout & Component Blueprint

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FORGEOS COMMAND CENTER   [Q Search...]    ● COMPUTE 12/12  ● SIM 3/3  ● MODEL VALIDATED  ● LIVE  │
├──────────────┬───────────────────────────────────────────────────────────────────────────────────┤
│ MISSION      │ CAMPAIGN: EV THERMAL SYSTEM v2  [RUN ID: EVT-024]                 ● RUNNING 68% │
│ CONTROL NAV  │ ───────────────────────────────────────────────────────────────────────────────── │
│              │ [ 121 EVALS ]   [ 96.3% FEASIBLE ]   [ 27.3% IMPROVEMENT ]   [ 3,472 HRS SAVED ]  │
│ COMMAND      │ ───────────────────────────────────────────────────────────────────────────────── │
│  Campaigns   │ ┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐  │
│  Runs        │ │ OPTIMIZATION CONVERGENCE             │ │ UNCERTAINTY & SEARCH SPACE MAP       │  │
│  Pareto      │ │  Best Observed vs GP Predicted        │ │  3D Scatter (Observed/Predicted/GP)  │  │
│              │ └──────────────────────────────────────┘ └──────────────────────────────────────┘  │
│ INTELLIGENCE │ ┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐  │
│  Surrogates  │ │ DIGITAL TWIN PHYSICAL SIMULATION     │ │ NEXT EXPERIMENTS QUEUE               │  │
│  Uncertainty │ │  EV Battery Coolant Field Vector     │ │  Queued candidate iterations         │  │
│              │ └──────────────────────────────────────┘ └──────────────────────────────────────┘  │
│ SIMULATION   │ ┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐  │
│  Adapters    │ │ SIMULATOR ADAPTERS MATRIX            │ │ LIVE ENGINEERING ACTIVITY STREAM     │  │
│  Compute     │ │  Ansys Fluent, STAR-CCM+, Abaqus...  │ │  Real-time event log with timestamps │  │
│              │ └──────────────────────────────────────┘ └──────────────────────────────────────┘  │
│ SYSTEM       │ ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  Telemetry   │ │ VALIDATION BENCHMARKS LAB                                                    │  │
│  12 Workers  │ │  Heat Exchanger | Wing Aero | Battery Cooling | Turbine Structural           │  │
│  98.7% Health│ └──────────────────────────────────────────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Anti-Pattern & Styling Guardrails

1. **No Generic SaaS Hero Headers**: Remove landing-page marketing banners. Replace with dense operational status meters.
2. **No Overused Rounding**: Restrain border radius to technical 4px–6px rounded corners with crisp 1px hairline borders (`border-cyan-500/20`).
3. **No Unnecessary Gradients or Glows**: Use crisp solid signals and subtle border highlights. Avoid heavy neon radial glows or gaming aesthetic.
4. **No Decorative Chatbots**: Keep all AI elements focused on objective computational reasoning, surrogate predictions, and optimization metrics.
5. **Information Density**: Large monospace numbers (`font-mono text-3xl font-bold tracking-tight`), sharp data tables, real-time sparklines, and telemetry badges.

---

## 5. File & View Mapping (Preserving 100% Functionality)

All existing tabs and routes are strictly preserved:

| Route / Tab ID | Existing Component | Redesign Enhancements |
| :--- | :--- | :--- |
| `dashboard` | `Dashboard.tsx` | Transformed into full Mission Command Center with 3-layer architecture |
| `wizard` | `ProblemWizard.tsx` | Mission Control Problem Definition Console with variable range sliders & constraint matrices |
| `studio` | `OptimizationStudio.tsx` | Live Campaign Telemetry & Execution Workbench with active progress meters |
| `run_details` | `RunDetailView.tsx` | Trial Inspector & Parameter Telemetry Console with Merkle Audit chain verification |
| `pareto` | `ParetoView.tsx` | Multi-Objective Pareto Frontier Analysis Matrix with trade-off scatter plots |
| `benchmarks` | `BenchmarkView.tsx` | Validation Lab with 4 technical benchmark instruments & comparative scorecards |
| `surrogate` | `SurrogateLab.tsx` | Gaussian Process & Neural Surrogate Diagnostics Workbench |
| `hitl` | `HumanInTheLoopView.tsx` | Engineer-in-the-Loop Constraint Override Console |
| `rl` | `ReinforcementLearningView.tsx` | Adaptive Policy & Deep RL Optimization Telemetry |
| `autonomous` | `AutonomousPipelineView.tsx` | Closed-Loop Autonomous Pipeline Execution Monitor |
| `audit` | `ExperimentAuditStudio.tsx` | Immutable Cryptographic Merkle Audit Trail Inspector |
| `ev_demo` | `EvThermalDemo.tsx` | EV Thermal System Engineering Simulation Model & Digital Twin |
| `tests` | `Phase2TestRunner.tsx` | System Verification & Master Diagnostic Runner |

---

## 6. Implementation Action Plan

1. **Step 1: System Telemetry Navigation (`Navbar.tsx`)**
   - Convert top header into a dark, technical aerospace navigation bar with mission control section headers, live worker count, compute health indicators, and tab switchers.

2. **Step 2: Command Center Main View (`Dashboard.tsx`)**
   - Re-architect layout to place active optimization campaign at the top.
   - Build 3-Layer Visual Interface: Command Metrics, Intelligence Search Space & Uncertainty Map, Physics Digital Twin Field, Simulator Adapters, Benchmark Instruments, and Live Engineering Activity Stream.

3. **Step 3: Component Styling Refinements**
   - Apply `#05090D` dark background, `#081117` technical panels, translucent cyan/mint/violet/amber signals, and sharp typography.

4. **Step 4: Verification**
   - Verify zero breaking changes to types, APIs, database logic, or routing using `lint_applet` and `compile_applet`.
