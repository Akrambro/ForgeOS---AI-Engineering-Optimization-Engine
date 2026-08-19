# Phase 01 — Core Optimization Engine

## Engineering critic verdict

### Main risk
Building a "flexible framework" before proving a deterministic optimization loop.

### Anti-hallucination risk
A coding agent may invent an abstract architecture with dozens of classes before one real run works.

### Engineering risk
A run can appear successful while silently accepting invalid numbers, constraint failures, or simulator errors.

### Corrective principle
Build the smallest executable kernel first.

## Objective

Implement:

```text
Problem
 -> Candidate
 -> Evaluator
 -> Result
 -> Constraint classification
 -> Run history
 -> Optimizer
```

## Scope

### Build
- problem schema
- variable/objective/constraint schemas
- evaluator contract
- Python evaluator
- run/trial persistence
- Random Search
- one evolutionary baseline
- API
- tests

### Explicitly exclude
- Bayesian optimization
- surrogate models
- RL
- external simulators
- HIL
- LLM/RAG
- multi-agent logic

## Core data model

### Problem
- id
- version
- variables
- objectives
- constraints
- evaluator reference

### Run
- id
- problem version
- algorithm
- algorithm config
- seed
- evaluation budget
- evaluator version
- code version

### Trial
- id
- run id
- candidate
- evaluator status
- objective values
- constraint values
- feasibility
- duration
- diagnostics
- error metadata

## Required semantics

A simulator/evaluator result must distinguish:

```text
FAILED
TIMEOUT
CANCELLED
SUCCEEDED + FEASIBLE
SUCCEEDED + INFEASIBLE
```

Never map:

```text
FAILED -> INFEASIBLE
```

## Task sequence

### T01
Create repository module boundaries.

### T02
Implement validated domain schemas.

### T03
Implement candidate validation.

### T04
Implement EvaluationAdapter and PythonFunctionAdapter.

### T05
Implement trial state machine.

### T06
Implement persistence.

### T07
Implement Random Search.

### T08
Implement evolutionary baseline.

### T09
Implement API.

### T10
Connect current frontend to real run state.

## Tests

### Unit
- invalid bounds
- missing variables
- extra variables
- nonfinite values
- constraint evaluation
- objective direction

### Integration
- full run
- persistence
- API lifecycle
- failure handling

### Reproducibility
Same problem + evaluator + algorithm + seed -> same candidate sequence within defined numerical tolerance.

### Sanity benchmark
Sphere function with known optimum at zero.

## Exit gate

Must demonstrate:
1. real API-created problem;
2. real evaluator call;
3. real optimization run;
4. trials persisted;
5. constraints classified;
6. failure path tested;
7. seeded reproduction tested;
8. frontend displays real run data.

## Agent prompt boundary

> Implement only Phase 01. Do not implement Bayesian optimization, surrogate modeling, RL or external simulator adapters. If you discover a need for one, document it and stop.
