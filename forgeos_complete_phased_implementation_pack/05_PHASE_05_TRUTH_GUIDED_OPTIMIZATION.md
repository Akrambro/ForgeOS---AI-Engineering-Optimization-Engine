# Phase 05 — Truth-Guided / Trust-Region Optimization

## Engineering critic verdict

### Main risk
Surrogate exploitation: optimizer finds regions where the surrogate is wrong.

### Mathematical risk
Predicted optimum can be an artifact of model extrapolation.

### Corrective principle
The surrogate proposes; the truth evaluator decides.

## Objective

Create a safeguarded optimization loop:

```text
truth data
 -> surrogate
 -> candidate proposal
 -> credibility filter
 -> truth evaluation
 -> update
```

## Scope

- trust-region or equivalent locality control
- acquisition score combining improvement and uncertainty
- truth-evaluation budget
- candidate rejection
- model update
- local validation
- convergence rules

## Core safeguards

1. Do not accept a surrogate-only optimum.
2. Do not allow uncontrolled extrapolation.
3. Require truth evaluations at regular/meaningful intervals.
4. Shrink search region when prediction quality deteriorates.
5. Expand only when truth evidence supports expansion.

## Exit metrics

- truth evaluations required to reach target
- surrogate prediction error
- number of rejected candidates
- constraint violations
- convergence

## Tasks

T01 trust-region state
T02 candidate credibility policy
T03 truth-evaluation scheduler
T04 update policy
T05 failure/recovery logic
T06 benchmark
T07 UI explanation

## Exit gate

Demonstrate lower truth-evaluation cost than baseline on a declared benchmark while preserving target quality.

## Required UI explanation

For each AI-selected candidate show:
- predicted objective
- uncertainty
- reason selected
- truth evaluation status
