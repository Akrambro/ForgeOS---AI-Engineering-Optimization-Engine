# Phase 02 — Benchmark & Experiment Fabric

## Engineering critic verdict

### Main risk
Creating a benchmark dashboard that reports convenient numbers instead of scientifically controlled comparisons.

### Anti-hallucination risk
Agent may hard-code expected results or compare algorithms with different budgets/settings.

### Engineering risk
A single stochastic run can produce a misleading winner.

### Corrective principle
Benchmark protocols are specifications, not charts.

## Objective

Create reproducible benchmark execution and comparison infrastructure.

## Scope

### Build
- benchmark definition schema
- benchmark runner
- seed matrix
- evaluation budget accounting
- convergence extraction
- result comparison
- report generation
- benchmark fixtures

## Benchmark types

1. Sphere
2. recognized non-convex benchmark
3. constrained benchmark
4. multi-objective benchmark reserved for regression
5. synthetic engineering-style problem

## Required controls

Record:
- algorithm
- configuration
- seed
- initialization
- budget
- evaluator version
- environment
- timestamp

## Metrics

Primary:
- best feasible result at budget
- evaluations to target

Secondary:
- feasibility rate
- failure rate
- wall time
- convergence curve
- evaluator cost

## Statistical rule

Do not claim algorithm superiority from one run.

For stochastic algorithms:
- use multiple seeds;
- report median and spread;
- retain raw runs.

## Tasks

T01 benchmark schema
T02 benchmark runner
T03 seed orchestration
T04 report generation
T05 regression benchmarks
T06 benchmark UI wiring
T07 performance tests

## Exit gate

The same benchmark suite can be run twice and produces equivalent results within a defined tolerance for deterministic components, and statistically consistent summaries for stochastic algorithms.

No hard-coded benchmark result may exist in production data paths.
