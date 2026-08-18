# Engineering Optimization Engine — Master Roadmap & PRD

## 1. Product Vision & Architecture Concept

The objective is to build a scientifically credible, deterministic optimization platform for engineering design, calibration, and control problems.

```text
                    USER
                      │
                      ▼
             DEFINE OPTIMIZATION
             ┌───────────────────┐
             │ Variables         │
             │ Bounds            │
             │ Objectives        │
             │ Constraints       │
             │ Evaluation budget │
             └─────────┬─────────┘
                       │
                       ▼
              OPTIMIZATION ENGINE
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Bayesian      Genetic       TPE/
       Optimization  Algorithms    CMA-ES
          │            │            │
          └────────────┼────────────┘
                       ▼
                EVALUATION ENGINE
                       │
             ┌─────────┴─────────┐
             │                   │
       Python function       Simulator (CFD/FEA/MATLAB)
             │                   │
             └─────────┬─────────┘
                       ▼
                    RESULTS
                       │
                       ▼
               Surrogate Model
                       │
                       ▼
                NEXT CANDIDATES
                       │
                       └──────► LOOP
```

---

## 2. Core Architectural Principles

1. **Strict Separation of Concerns**: Optimization algorithms are decoupled from evaluation adapters.
2. **Unified Evaluation Interface (`EvaluationAdapter`)**:
   $$\mathbf{x} \in \mathcal{X} \xrightarrow{\text{EvaluationAdapter}} \{\text{Objectives}, \text{Constraints}, \text{Metadata}, \text{Status}\}$$
3. **Rigorous Reproducibility**: Seeded PRNGs, versioned problem specifications, and immutable trial histories.
4. **Standardized Scientific Stack**:
   - Algorithms: Random Search, Differential Evolution, TPE, Bayesian Optimization (Gaussian Process), NSGA-II.
   - Core Architecture: TypeScript / React UI + Node / Python Evaluation Worker Interfaces.

---

## 3. Phase-Wise Development Roadmap

| Phase | Milestone | Focus / Deliverables | Status |
|---|---|---|---|
| **Phase 0** | **Mathematical Foundation** | Variables (continuous, integer, categorical, discrete), Objectives, Constraints, Evaluation Contract, Budget, Reproducibility Engine, Core Types | **COMPLETED** |
| **Phase 1** | **Basic Optimizer Suite** | Random Search (baseline), Differential Evolution, Bayesian Optimization, NSGA-II, Phase 1 Verification Test Suite | **COMPLETED** |
| **Phase 2** | **Experiment Engine** | Immutable Experiment/Trial audit trail, Merkle hash chains, checkpoints & resume, regret metrics, diff analysis, Phase 2 Verification Suite | **COMPLETED** |
| **Phase 3** | **Surrogate Model** | Gaussian Process Regressor, covariance kernels (Matérn 5/2, RBF), uncertainty quantification ($\mu \pm 2\sigma$), validation metrics (RMSE, R²), Phase 3 Verification Suite (7 tests) | **COMPLETED** |
| **Phase 4** | **Active Learning** | Acquisition functions (Expected Improvement, UCB, Probability of Improvement, Constrained EI, Cost-Aware sampling), Multi-candidate batch queries, Phase 4 Verification Suite (7 tests) | **COMPLETED** |
| **Phase 5** | **Multi-Objective Engineering** | Non-dominated sorting ($O(MN^2)$), crowding distance, Hypervolume (HV), Generational Distance (GD/IGD), Knee point detection, TOPSIS MCDM preference weighting, Phase 5 Verification Suite (7 tests) | **COMPLETED** |
| **Phase 6** | **Real Simulator Adapter** | Python script execution, CLI process adapter, file-based I/O parsers (MATLAB/Simulink/CFD/FEA readiness), Phase 6 Verification Suite (7 tests) | **COMPLETED** |
| **Phase 7** | **Human-in-the-Loop Testing** | Candidate verification & approval gate, risk assessment, expert candidate injection, dynamic ROI steering, Phase 7 Verification Suite (7 tests) | **COMPLETED** |
| **Phase 8** | **Reinforcement Learning** | Sequential decision control (State $\to$ Action $\to$ Next State $\to$ Reward), EV thermal management, CSTR chemical reactor, inverted pendulum, Meta-RL optimizer adaptation, Phase 8 Verification Suite (7 tests) | **COMPLETED** |
| **Phase 9** | **Autonomous Engineering Loop** | End-to-end multi-stage pipeline, epistemic surrogate bootstrap, active learning loop, Pareto refinement, hypervolume stationarity convergence diagnostics, anomaly self-healing, Sobol sensitivity decomposition, TOPSIS compromise selection, and automated technical report synthesis | **COMPLETED** |

---

## 13. Phase 9 Specification & Acceptance Criteria

### 13.1 Autonomous Multi-Stage Pipeline Architecture
- **Stage 1 (Exploration)**: Space-filling Latin Hypercube sampling across mixed-type parameter spaces.
- **Stage 2 (Surrogate Bootstrap)**: Fitting Gaussian Process surrogate with Matérn 5/2 kernel and Cholesky decomposition.
- **Stage 3 (Active Learning Exploitation)**: Acquisition function optimization (EI / UCB) balancing epistemic exploration and reward exploitation.
- **Stage 4 (Pareto Refinement)**: Non-dominated sorting ($O(MN^2)$), crowding distance, and 2D hypervolume computation.
- **Stage 5 (Convergence Assessment)**: Multi-metric diagnostic checking hypervolume change ($\Delta \text{HV} \le \epsilon$), relative objective improvement ($\le \text{tol}$), parameter diversity, and stationarity score.
- **Stage 6 (Decision Synthesis)**: TOPSIS multi-criteria compromise selection and automated technical engineering report synthesis with Merkle cryptographic signature seal.

### 13.2 Phase 9 Verification Test Matrix (7 Tests)
1. **Multi-Stage Autonomous Pipeline Stage Transitions & State Machine**: Verifies deterministic stage-by-stage progression through all 6 phases.
2. **Convergence Diagnostics (Hypervolume Stagnation & Relative Tolerance)**: Validates multi-metric convergence detection within specified evaluation budgets.
3. **Anomaly Detection & Simulator Failure Auto-Recovery**: Detects NaN/Inf, out-of-bounds parameters, simulation timeouts, and applies automated self-healing penalty/clamp recovery.
4. **Sensitivity Analysis & Parameter Importance Ranking**: Computes first-order and total Sobol-inspired variance decomposition to rank parameter impacts.
5. **Automated TOPSIS Decision Synthesis & Recommended Design Selection**: Applies preference weights to extract the ideal compromised Pareto solution.
6. **Full End-to-End Autonomous Pipeline Execution & Merkle Verification**: Validates end-to-end autonomous optimization loop with cryptographic SHA-256 Merkle chain integrity.
7. **Automated Technical Report Generation & Cryptographic Signature Seal**: Validates deterministic and AI-synthesized executive engineering reports.

---

## 4. Phase 0 Specification & Acceptance Criteria

### 4.1 Variable Type System
- **Continuous**: Real-valued parameters with $[L_i, U_i]$ bounds and step increments.
- **Integer**: Discrete whole-number parameters with $[L_i, U_i]$ ranges.
- **Categorical**: Finite set of symbolic choices $\{c_1, c_2, \dots, c_k\}$.
- **Discrete**: Explicit scalar set $\{v_1, v_2, \dots, v_m\}$.

### 4.2 Objectives & Directions
- **Minimize**: $f_i(\mathbf{x}) \to \min$
- **Maximize**: $f_i(\mathbf{x}) \to \max$ (internally normalized via $-f_i(\mathbf{x})$)

### 4.3 Constraint Formulation
- **Inequality**: $g_j(\mathbf{x}) \le 0$ or $g_j(\mathbf{x}) \ge 0$
- **Equality**: $|h_k(\mathbf{x}) - \text{target}| \le \epsilon$
- **Feasibility Metric**: $\text{Feasible}(\mathbf{x}) \iff \forall j, g_j(\mathbf{x}) \le 0 \land \forall k, |h_k(\mathbf{x})| \le \epsilon$

### 4.4 Evaluation & Budget Protocol
- **Budget**: `maxEvaluations`, `maxWallClockMs`, `maxCost`
- **Reproducibility State**: Seed, algorithm configuration, problem hash, code version, dataset version.

---

## 5. Phase 1 Specification & Acceptance Criteria

### 5.1 Optimizer Implementations
- **Random Search (Baseline)**: Uniform sampling across continuous $[L_i, U_i]$, integer ranges, categorical choice sets, and discrete values.
- **Differential Evolution**: DE/rand/1/bin with mutation factor $F$, crossover rate $CR$, boundary reflection, discrete/categorical mutation, and elitist selection.
- **Bayesian Optimization**: Gaussian Process surrogate with Matérn-5/2 kernel, analytical Expected Improvement ($\text{EI}$) acquisition, and Upper Confidence Bound ($\text{UCB}$) exploration.
- **NSGA-II**: Fast non-dominated sorting ($O(MN^2)$), crowding distance assignment, Simulated Binary Crossover ($\text{SBX}$), and polynomial mutation.

### 5.2 Verification Test Matrix
1. **Reproducibility Test**: Two runs with identical seeds yield bit-for-bit identical candidate sequences and objective outputs.
2. **Domain Bounds Test**: Validates 0 bound/choice violations across mixed variable spaces.
3. **Random Search Baseline**: Verifies evaluation budget adherence and benchmark initialization.
4. **Differential Evolution Convergence**: Verifies DE discovers near-optimal candidates on multimodal functions (Ackley, Sphere).
5. **Bayesian Optimization Surrogate**: Fits GP model, predicts $\mu \pm \sigma$, and maximizes Expected Improvement.
6. **NSGA-II Pareto Front Sorting**: Confirms Rank 1 non-domination on multi-objective benchmark (ZDT1).
7. **Constraint Feasibility Handling**: Confirms penalty enforcement and discovery of feasible solutions under non-linear constraints (Welded Beam, EV Thermal).

