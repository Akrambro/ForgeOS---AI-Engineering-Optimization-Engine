# Phase 08 — Daitya Engineering Pilot

## Engineering critic verdict

### Main risk
Choosing a problem because it is exciting rather than because it is measurable and safe.

### Corrective principle
Pick a narrow simulator-based problem with:
- 5–20 meaningful variables;
- clear objectives;
- hard constraints;
- repeatable evaluation;
- no immediate safety-critical actuation;
- an agreed baseline.

## Candidate classes

Prefer:
- thermal calibration/optimization;
- cooling architecture;
- energy efficiency;
- parameter calibration;
- another low-risk design-space problem.

Avoid initially:
- autonomous steering/braking control;
- safety-critical active control;
- road vehicle actuation;
- anything where an incorrect candidate can create immediate physical hazard.

## Pilot protocol

### Baseline
Record:
- existing engineering workflow;
- number of simulations/tests;
- engineer time;
- time-to-decision;
- acceptance criteria.

### ForgeOS
Run:
- same objective;
- same constraints;
- same evaluator fidelity;
- controlled budget.

## Success definition

The pilot is successful if ForgeOS demonstrates a measured improvement in one or more of:
- truth evaluations to target;
- engineering elapsed time;
- compute cost;
- number of manual iterations;

WITHOUT reducing agreed engineering acceptance criteria.

## Required evidence

- problem definition
- simulator version
- run history
- candidate set
- selected design
- baseline comparison
- limitations
- engineering owner sign-off

## No marketing claim

Do not publish "X% faster" until the baseline and measurement protocol are agreed and evidence exists.
