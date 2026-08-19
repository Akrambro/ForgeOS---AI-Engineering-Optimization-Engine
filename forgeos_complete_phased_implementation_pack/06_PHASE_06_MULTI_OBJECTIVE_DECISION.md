# Phase 06 — Multi-Objective Optimization & Engineering Decision Support

## Engineering critic verdict

### Main risk
A Pareto plot looks impressive but does not make the engineering decision.

### Corrective principle
Separate:
1. Pareto generation;
2. filtering;
3. engineering selection.

## Objective

Support multiple objectives without hidden scalarization.

## Scope

- Pareto front generation
- dominance classification
- constraint filtering
- candidate comparison
- trade-off visualization
- explicit decision record

## Required semantics

Every selected candidate must retain:
- all objective values;
- all constraint values;
- run/evaluator version;
- selection rationale.

## No hidden weights

If a user wants weighted scoring:
- expose the weights;
- version them;
- store them with the decision;
- show sensitivity where practical.

## Decision object

```text
decision_id
selected_candidate
criteria
weights_if_any
engineer
timestamp
approval_status
```

## Tasks

T01 multi-objective schema
T02 Pareto engine
T03 filtering
T04 candidate comparison
T05 decision record
T06 frontend
T07 benchmark regression

## Exit gate

A user can compare multiple feasible candidates and record an explicit engineering decision without the platform silently changing objective priorities.
