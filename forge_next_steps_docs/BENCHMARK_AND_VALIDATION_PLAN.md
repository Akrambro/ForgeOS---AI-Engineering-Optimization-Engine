# ForgeOS — Benchmark & Validation Plan

## Purpose
Prove whether ForgeOS reduces evaluation cost while preserving an engineering target.

## Benchmarks
B01: 4D Sphere — sanity/reproducibility
B02: recognized non-convex benchmark — local minima/global search
B03: recognized constrained benchmark — constraints
B04: recognized multi-objective benchmark — future Pareto regression
B05: synthetic engineering-style thermal problem — integration only

Synthetic benchmarks are NOT physical validation.

## Primary metrics
1. Truth evaluations required to reach a predefined target.
2. Best feasible quality at a fixed evaluation budget.
3. Feasibility rate.
4. Failed/timeout evaluation rate.
5. Wall-clock time.

## Comparison protocol
For stochastic methods:
- predeclare seeds
- use multiple seeds for claims
- preserve all runs
- report spread/median

Control or disclose:
- initialization
- evaluation fidelity
- hardware
- parallelism
- stopping rule
- constraints
- budget

## Surrogate validation
Use:
- holdout data
- local error near candidate optima
- error near constraints
- out-of-domain checks
- truth-model confirmation

## Engineering validation matrix
For each real pilot:
- intended use
- evaluator/model
- verification evidence
- validation conditions
- uncertainty
- limitations
- approval

## Pilot KPI
Measure:
> truth-model evaluations needed to reach the agreed engineering target.

Do not pre-commit to a percentage saving before measurement.
