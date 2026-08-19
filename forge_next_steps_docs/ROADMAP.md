# ForgeOS — Corrected Roadmap

## Stage 0 — Frontend stabilization
Freeze the visual layer. Connect it later to real APIs.

## Stage 1 — Core Engine Foundation
Schemas, validation, evaluator contract, Python evaluator, Random Search, evolutionary baseline, persistence, failures, API.

Gate: reproducibility + Sphere + failure/constraint tests.

## Stage 2 — Optimization & Benchmark Fabric
Recognized benchmarks, initial design abstraction, repeated-seed protocol, convergence/reporting.

Gate: benchmark results reproducible from actual runs.

## Stage 3 — Bayesian Optimization
GP-based BO, acquisition functions, constrained BO where justified.

Gate: demonstrated benefit under a declared evaluation-cost protocol on at least one expensive benchmark.

## Stage 4 — Surrogate Reliability
Holdout validation, uncertainty, local checks, out-of-domain detection, residuals, truth-model checks.

Gate: no surrogate result is labeled validated by training metrics alone.

## Stage 5 — Truth-Guided Surrogate Optimization
Trust-region/equivalent locality control, periodic truth evaluation, candidate rejection when model credibility is insufficient.

Gate: lower truth-evaluation cost without unacceptable loss of target quality.

## Stage 6 — Multi-Objective & Decision Support
Pareto generation, filtering, explicit engineering decision step.

Gate: no hidden scalarization.

## Stage 7 — First External Simulator
Choose ONE real simulator that can be accessed legally/reliably. Build a robust adapter.

Gate: reproducible end-to-end simulator optimization.

## Stage 8 — Daitya Pilot
One low-risk simulation-based engineering problem, preferably thermal/calibration/energy.

Gate: measured benefit against an agreed baseline.

## Stage 9 — Robust Engineering Optimization
Parameter uncertainty, tolerances, environmental scenarios, robustness metrics.

Gate: acceptable robustness for intended use.

## Stage 10 — HIL / Physical Experiments
Human approval, safety interlocks, result ingestion, HIL adapter.

Gate: no uncontrolled actuation.

## Stage 11 — Adaptive Control / RL
Only when the problem is truly sequential and a simulation environment exists.

Gate: constrained offline validation + sim-to-real plan.

## Stage 12 — Autonomous Engineering Loop
Bounded and auditable objective -> candidate -> truth evaluation -> model update -> next experiment.

Product strategy:
Build horizontally; enter vertically through automotive engineering first.
