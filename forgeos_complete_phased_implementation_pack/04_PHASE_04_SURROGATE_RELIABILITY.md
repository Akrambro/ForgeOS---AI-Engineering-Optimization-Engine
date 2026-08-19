# Phase 04 — Surrogate Reliability

## Engineering critic verdict

### Main risk
Confusing predictive accuracy with engineering credibility.

### Failure modes
A surrogate can fail near:
- active constraints;
- optima;
- discontinuities;
- sparse regions;
- extrapolation zones.

### Anti-hallucination risk
Agent may show R² and label the model "validated."

### Corrective principle
Surrogate reliability is a distinct subsystem.

## Objective

Create a controlled model-lifecycle layer for surrogate models.

## Scope

- training dataset snapshots
- holdout validation
- residual metrics
- local candidate validation
- uncertainty reporting
- out-of-domain detection
- model versioning
- truth-model confirmation

## Required model states

```text
DRAFT
TRAINING
EVALUATED
ACCEPTABLE_FOR_SEARCH
REJECTED
RETIRED
```

Avoid generic "VALIDATED" unless intended-use criteria are explicitly satisfied.

## Metrics

At minimum:
- RMSE
- MAE
- max absolute error
- validation sample count
- local error near candidate optimum
- local constraint-boundary error

## Uncertainty rule

Do not call model predictive variance "engineering confidence."

Use precise labels.

## Truth-model policy

Every selected candidate must be eligible for truth-model confirmation.

## Tasks

T01 dataset snapshot
T02 GP/surrogate lifecycle
T03 validation metrics
T04 out-of-domain detector
T05 local validation
T06 model registry
T07 frontend status

## Exit gate

A model cannot progress to search use unless:
- held-out validation exists;
- limitations recorded;
- out-of-domain behavior defined;
- truth-model confirmation path exists.
