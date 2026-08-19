# ForgeOS — Engineering Critique of the Earlier Roadmap

## Verdict
The earlier roadmap was directionally correct but too broad for an autonomous coding agent and insufficiently strict scientifically.

## Critical flaws

### 1. One optimizer cannot cover every engineering problem
Design optimization, calibration, inverse problems, sequential control, reliability and manufacturing control have different mathematical structures. ForgeOS needs pluggable problem types rather than a universal “AI optimizer.”

### 2. Bayesian optimization is not a universal default
BO is attractive for expensive black-box functions but can struggle with high dimension, mixed/categorical variables, discontinuities, strong noise, parallelism and changing systems. It must be benchmarked, not assumed superior.

### 3. “250 vs 10,000 simulations” is not itself a valid KPI
Compare quality at equal evaluation cost, or cost to reach a predefined engineering target. Control for seeds, initialization, fidelity, constraints, parallelism and stopping rules.

### 4. The synthetic EV model can create false confidence
Synthetic equations are useful for plumbing and regression tests, not physical evidence. Arbitrary equations can encode an easy answer and are not substitutes for CFD/FEA/HIL/physical validation.

### 5. Surrogate R² is insufficient
A surrogate can have excellent global error and still be wrong near constraints or the selected optimum. Use held-out validation, local checks, out-of-domain detection and truth-model confirmation.

### 6. GP uncertainty is not total engineering uncertainty
Predictive variance does not automatically include simulator discretization error, model-form error, material uncertainty, sensor uncertainty or physical-model mismatch. Label uncertainty precisely.

### 7. Surrogate optimization needs safeguards
A naive “optimize the surrogate and trust the optimum” loop can exploit model error. Use truth-model checks and later a trust-region/equivalent control strategy.

### 8. External simulator integration is much harder than an API call
Adapters need version capture, input generation, licensing/environment handling, process isolation, timeout, crash detection, convergence status, stale-output detection, result extraction, logs, artifacts and reproducibility.

### 9. Configuration control was under-specified
A run must reference immutable versions of the problem, evaluator, algorithm/configuration, seed, dataset/model versions, code commit and relevant environment.

### 10. Too many algorithms too early
Phase 01 should use a small baseline set. Build an algorithm catalog only when benchmarking proves a need.

### 11. Random search should not be the only baseline
Use a documented uninformed baseline plus a space-filling initial design when appropriate, followed by an evolutionary baseline.

### 12. Pareto front is not the final engineering decision
Multi-objective optimization must be separated from candidate filtering and engineering decision selection. Do not silently convert objectives into arbitrary weights.

### 13. No robustness layer
Nominal optimum is not necessarily robust against tolerances, environment, aging or parameter uncertainty.

### 14. No numerical-quality layer
Detect NaN, infinity, invalid ranges, unit problems, duplicate/stale outputs, solver failures and nonphysical results.

### 15. RL/HIL were introduced too early
They add sequential dynamics, real-time requirements, safety constraints and sim-to-real risk. They must be late phases with explicit safety gates.

### 16. The polished frontend can create false maturity
Use explicit states such as MOCK, SIMULATED, PREDICTED, VALIDATED and ENGINEERING APPROVED. A green VALIDATED badge must never come from a training metric alone.

### 17. Competitive boundary
Existing products already cover parts of the space. Simulink Design Optimization, for example, already supports parameter tuning, sensitivity, design-response optimization and controller/plant optimization. ForgeOS should differentiate through heterogeneous evaluation orchestration, traceability, uncertainty-aware experiment selection and truth-model verification.

## Revised thesis
ForgeOS should be an evaluation-orchestration and optimization system for expensive engineering problems:
> Which candidate should be evaluated next, why, with what evidence, and what engineering target has actually been demonstrated?

## Verdict
The earlier roadmap should NOT be implemented unchanged. Follow ROADMAP.md and PHASE_01_CORE_ENGINE.md.
