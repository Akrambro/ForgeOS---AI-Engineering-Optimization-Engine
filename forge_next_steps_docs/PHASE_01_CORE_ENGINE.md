# ForgeOS — Phase 01: Core Engine Foundation

## Objective
Build the first scientifically controlled backend:
> define problem -> attach evaluator -> run baseline optimizer -> persist trials -> retrieve trustworthy results.

## Implement
1. Problem schema
2. Variable schema
3. Objective schema
4. Constraint schema
5. EvaluationResult
6. EvaluationAdapter
7. PythonFunctionAdapter
8. Trial lifecycle
9. OptimizationRun lifecycle
10. Random Search
11. One evolutionary baseline
12. validation
13. persistence
14. API
15. tests

## Do NOT implement
- Bayesian optimization
- Gaussian Process
- active learning
- RL
- external simulators
- HIL
- LLM/RAG
- CAD generation
- microservices

## Variable validation
Check:
- type
- finite value
- lower < upper
- default within bounds

## Constraint semantics
Initial operators:
- <=
- >=

The result must distinguish:
- evaluator failed
- evaluator succeeded + feasible
- evaluator succeeded + infeasible

## Trial lifecycle
QUEUED -> RUNNING -> SUCCEEDED / FAILED / TIMEOUT / CANCELLED

## Baselines
Random Search and one established evolutionary method.
Use mature libraries where possible rather than reimplementing mathematics.

## Budget accounting
Persist:
- attempted evaluations
- successful evaluations
- failed evaluations
- timeouts
- wall time
- configured budget

## API
POST /problems
GET /problems
GET /problems/{id}
POST /runs
GET /runs
GET /runs/{id}
GET /runs/{id}/trials
GET /runs/{id}/result

## Required tests
- schema validation
- candidate validation
- constraint logic
- evaluator failure
- timeout handling
- seeded reproducibility
- Sphere benchmark
- persistence
- API lifecycle

## Exit gate
Phase 01 completes only when:
- tests pass
- lint passes
- type checks pass
- seeded run is reproducible
- failures are preserved
- constraints are explicit
- frontend can consume real run data
- no metric is hard-coded into the backend

STOP after this phase.
