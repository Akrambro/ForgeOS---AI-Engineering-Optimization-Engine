# ForgeOS — Next-Step Development Documentation

## Purpose
Freeze the frontend and build a scientifically controlled optimization kernel. The immediate goal is not the full autonomous engineering platform.

## Immediate scope
Build only:
- problem schema
- variables, objectives, constraints
- evaluator contract
- runs/trials/results
- deterministic baseline optimization
- validation
- persistence
- API
- tests
- real frontend data plumbing

Do not build yet:
- LLM/RAG
- RL
- deep surrogate models
- active learning
- external simulators
- HIL
- CAD generation
- autonomous physical control
- microservices/Kubernetes
- billing/multi-tenancy

## Product KPI
ForgeOS should reduce evaluation cost/time/effort required to reach a defined engineering target while retaining appropriate evidence and validation.

## Core principle
A simulator/evaluator is the source of truth for an evaluated candidate. A surrogate is an approximation. An optimizer is not truth. An LLM must never manufacture engineering truth.

## Reference basis
The controls in this package are informed by NASA systems engineering/model & simulation guidance, ASME V&V/VVUQ practices, and current optimization tooling documentation.
