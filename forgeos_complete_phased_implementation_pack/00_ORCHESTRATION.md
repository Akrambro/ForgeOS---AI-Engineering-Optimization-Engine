# ForgeOS — Multi-Agent Implementation Orchestration

## Decision

Multiple coding agents are useful, but ForgeOS must **not** be developed as 12 independent concurrent projects.

The architecture has hard dependency boundaries.

### Recommended agent strategy

```text
Agent F1  -> Phase 01 Core Engine
                |
                v
Agent F2  -> Phase 02 Benchmark Fabric
                |
                v
Agent F3  -> Phase 03 Bayesian Optimization
                |
                v
Agent F4  -> Phase 04 Surrogate Reliability
                |
                v
Agent F5  -> Phase 05 Truth-Guided Optimization
                |
                v
Agent F6  -> Phase 06 Multi-Objective / Decision
                |
                v
Agent F7  -> Phase 07 External Simulator
                |
                v
Agent F8  -> Phase 08 Daitya Pilot
                |
                v
Agent F9  -> Phase 09 Robust Optimization
                |
                v
Agent F10 -> Phase 10 HIL / Physical Experiments
                |
                v
Agent F11 -> Phase 11 RL / Adaptive Control
                |
                v
Agent F12 -> Phase 12 Autonomous Engineering
```

## Where parallel agents are safe

Parallel work is useful only when the work is contract-first and does not modify the same source-of-truth modules.

Safe examples:

- benchmark dataset preparation;
- documentation;
- test fixtures;
- UI adapters;
- simulator adapter interface scaffolding;
- algorithm research branches;
- performance test harnesses.

Unsafe examples:

- multiple agents changing `core/problem`, `core/evaluation`, or database schema simultaneously;
- multiple agents changing API contracts without a contract owner;
- two agents implementing different interpretations of the same scientific metric.

## Repository policy

Use Git branches/worktrees.

Recommended:

```text
main
  |
  +-- phase/01-core
  +-- phase/02-benchmarks
  +-- phase/03-bo
  +-- phase/04-surrogate
```

Only merge a phase after its predecessor has passed its exit gate.

## Contract freeze rule

Before Phase N implementation starts, the interface it depends on must be frozen.

Example:

Phase 03 cannot freely redefine the EvaluationResult schema established in Phase 01.

If a change is genuinely required:

1. create a decision record;
2. identify all affected phases;
3. update contracts;
4. rerun affected tests.

## Agent authority

An agent may modify only:

- files explicitly assigned to its phase;
- its tests;
- its phase documentation;
- permitted integration points.

An agent may not:
- silently rewrite earlier phases;
- add future features;
- change scientific semantics;
- invent external APIs;
- claim validation without evidence.

## Recommended concurrency

### Wave A
Phase 01.

### Wave B
Phase 02 + test/benchmark fixture preparation in a separate branch.

### Wave C
Phase 03 + Phase 04 can be developed in isolated branches after the core contracts are frozen, but integration remains sequential.

### Wave D
Phase 05 + Phase 06 can have documentation/test preparation in parallel.

### Wave E
Phase 07 requires actual simulator environment and should have one dedicated integration owner.

### Wave F
Phases 08–12 should be executed sequentially because they introduce increasingly real engineering and safety consequences.

## Merge gate

No phase is "done" because the code compiles.

A merge requires:

- tests;
- type checks;
- lint;
- benchmark/validation evidence where applicable;
- documented limitations;
- changed-file audit;
- phase acceptance checklist;
- no unauthorized scope expansion.
