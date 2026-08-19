# Phase 11 — Reinforcement Learning / Adaptive Control

## Engineering critic verdict

### Main risk
Using RL merely because it is fashionable.

RL is appropriate only when:
- system is sequential/dynamic;
- actions alter future state;
- a meaningful reward/cost exists;
- training environment is available;
- safety constraints can be enforced.

## Objective

Build an offline/constrained RL capability for justified sequential-control problems.

## Scope

- explicit state definition
- action definition
- reward/cost definition
- simulator environment
- action bounds
- safety constraints
- offline evaluation
- policy versioning
- fallback controller

## Do not begin with hardware

First:
```text
simulation
 -> policy
 -> offline validation
 -> stress tests
 -> bounded HIL
```

## Required controls

- action clipping;
- policy watchdog;
- fallback policy;
- episode timeout;
- observation validation;
- distribution-shift detection;
- policy rollback.

## RL selection rule

The phase must document why:
- standard optimization;
- model-predictive control;
- adaptive control;
- Bayesian methods

are insufficient or less appropriate.

RL is not the default.

## Tasks

T01 problem formulation
T02 environment
T03 safety layer
T04 baseline controller
T05 offline RL
T06 stress testing
T07 HIL shadow mode

## Exit gate

RL must outperform the baseline under declared conditions without violating safety constraints in simulation and controlled validation.

No direct road-vehicle autonomy from this phase alone.
