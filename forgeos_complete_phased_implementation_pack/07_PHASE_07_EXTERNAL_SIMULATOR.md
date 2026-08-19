# Phase 07 — First External Simulator Adapter

## Engineering critic verdict

### Main risk
Treating a simulator as a stateless function call.

### Real risks
- environment mismatch
- version drift
- license issues
- stale files
- solver non-convergence
- partial output
- resource exhaustion
- unit mismatch
- hidden defaults

## Objective

Connect ONE real simulator through a robust adapter.

## Selection rule

Choose the simulator with:
- reliable organizational access;
- repeatable invocation;
- stable result extraction;
- measurable engineering problem;
- low safety consequence.

Do not integrate several at once.

## Adapter lifecycle

```text
PREPARE
 -> WRITE INPUT
 -> START
 -> MONITOR
 -> COMPLETE / FAIL / TIMEOUT
 -> EXTRACT
 -> VALIDATE OUTPUT
 -> STORE ARTIFACTS
```

## Required metadata

- simulator name
- version
- host/environment
- input checksum
- output checksum
- adapter version
- runtime
- license/environment status if relevant

## Stale-output protection

Never accept an output file merely because it exists.

Verify:
- run-specific output location;
- timestamp/checksum;
- expected output schema.

## Solver status

Distinguish:
- converged;
- non-converged;
- crashed;
- timed out;
- invalid output.

## Tasks

T01 simulator investigation
T02 adapter specification
T03 sandboxed execution
T04 result extractor
T05 artifact capture
T06 failure handling
T07 reproducibility
T08 end-to-end optimization

## Exit gate

Same input + same simulator environment + same adapter version produces equivalent outputs within an agreed tolerance.

Optimization can run end-to-end without corrupting results when the simulator fails.
