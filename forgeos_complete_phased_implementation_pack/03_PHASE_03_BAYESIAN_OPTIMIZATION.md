# Phase 03 — Bayesian Optimization

## Engineering critic verdict

### Main risk
Treating Bayesian optimization as the universal ForgeOS algorithm.

### Mathematical risks
- poor scaling with dimension;
- mixed variables;
- noisy objectives;
- discontinuities;
- constraints;
- batch/parallel evaluations;
- model misspecification.

### Anti-hallucination risk
Agent may write a custom GP/BO implementation when a mature library is safer.

### Corrective principle
Use a mature implementation behind an internal abstraction and benchmark it against the Phase 02 baselines.

## Objective

Introduce expensive-evaluation-aware search for supported problem classes.

## Preconditions

Phase 01 and Phase 02 exit gates passed.

## Scope

### Build
- GP model wrapper
- acquisition abstraction
- Bayesian optimizer adapter
- bounded continuous problem support first
- constrained support only after unconstrained regression tests pass

### Not yet
- neural surrogates
- deep ensembles
- active learning
- RL
- automatic optimizer selection by LLM

## Required configuration

- kernel/model configuration
- acquisition function
- initial design
- evaluation budget
- random seed
- numerical tolerances

## Validation

Use recognized mathematical benchmarks and the synthetic engineering problem.

Compare:
- best quality at equal truth-evaluation budget;
- evaluations to target;
- runtime;
- failure behavior.

## Engineering guard

Do not call an optimizer result "global optimum" unless mathematically justified. Use "best observed" or "candidate optimum."

## Tasks

T01 model wrapper
T02 acquisition wrapper
T03 BO adapter
T04 regression tests
T05 constrained extension
T06 benchmark comparison
T07 UI integration

## Exit gate

BO demonstrates measurable benefit on at least one expensive benchmark under a predefined protocol without unacceptable numerical failures.

No general claim such as "BO is always better."
