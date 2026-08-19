# Phase 10 — HIL & Physical Experimentation

## Engineering critic verdict

### Main risk
Crossing from software optimization into physical actuation without adequate safeguards.

### Corrective principle
Human approval and safety boundaries are first-class system requirements.

## Objective

Use ForgeOS to schedule and analyze HIL/physical experiments before considering autonomous actuation.

## Scope

- experiment plan
- approval state
- HIL adapter
- sensor/result ingestion
- safety interlocks
- experiment artifacts
- calibration metadata

## Experiment state

```text
PROPOSED
 -> REVIEW
 -> APPROVED
 -> READY
 -> EXECUTING
 -> COMPLETE
```

Failure:
```text
ABORTED
FAILED
```

## Safety rules

- no direct unrestricted actuator commands from optimizer;
- explicit allowed action space;
- emergency stop outside the AI;
- bounded experiment duration;
- preflight checks;
- hardware/environment status checks;
- human approval for new experiment classes.

## Tasks

T01 HIL requirements
T02 experiment schema
T03 approval workflow
T04 adapter
T05 safety envelope
T06 results ingestion
T07 dry-run simulator
T08 controlled experiment

## Exit gate

An approved HIL/physical experiment can be executed, audited and safely aborted with complete result lineage.

No autonomous hardware loop yet.
