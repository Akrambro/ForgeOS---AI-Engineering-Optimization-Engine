# Phase 12 — Autonomous Engineering Loop

## Engineering critic verdict

### Main risk
Turning a bounded optimizer into an uncontrolled agent.

### Corrective principle
Autonomy means orchestration, not unrestricted authority.

## Objective

Allow ForgeOS to automatically conduct bounded engineering search while maintaining traceability and approval boundaries.

## Target loop

```text
engineering objective
 -> problem formulation
 -> candidate generation
 -> truth evaluation
 -> model update
 -> uncertainty assessment
 -> next experiment
 -> convergence
 -> candidate report
```

## Autonomy levels

### L0
Human defines everything.

### L1
AI proposes candidates.

### L2
AI schedules approved simulations automatically.

### L3
AI updates surrogate and selects next experiment within approved boundaries.

### L4
AI runs a bounded campaign without per-trial human approval.

### L5
Not a default target. Any physical actuation would require a separate safety case.

## Required governance

Every action must record:
- reason;
- input;
- model/policy version;
- approval state;
- outcome;
- rollback/recovery path.

## Bounded autonomy

The system must have:
- maximum budget;
- allowed variable ranges;
- hard constraints;
- evaluator whitelist;
- time limit;
- termination condition;
- failure budget.

## Stop conditions

Stop when:
- target reached;
- budget exhausted;
- uncertainty too high;
- repeated evaluator failure;
- constraint instability;
- model credibility falls below threshold.

## Tasks

T01 autonomous campaign state machine
T02 policy/permission model
T03 bounded scheduler
T04 explainability record
T05 recovery
T06 campaign resume/replay
T07 audit trail
T08 human approval integration

## Exit gate

A bounded autonomous optimization campaign is reproducible, auditable, stoppable and no less trustworthy than the corresponding human-supervised process.

Autonomy cannot bypass engineering approval requirements.
