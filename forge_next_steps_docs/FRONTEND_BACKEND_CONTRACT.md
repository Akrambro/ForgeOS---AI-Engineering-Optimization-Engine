# ForgeOS — Frontend / Backend Contract

## Principle
The frontend is a presentation layer. The backend is the source of run state.

Never fabricate engineering numbers to complete a dashboard.

## Campaign
- campaign_id
- name
- problem_id
- status
- algorithm
- progress

## Run summary
- run_id
- budget
- attempted
- succeeded
- failed
- best_observed
- best_feasible
- feasibility_rate
- elapsed_time

## Trial
- trial_id
- candidate
- status
- objectives
- constraints
- feasibility
- duration
- timestamp

## Convergence
- evaluation_index
- best_observed
- best_feasible

## UI states
MOCK
READY
QUEUED
RUNNING
SIMULATED
PREDICTED
SUCCEEDED
FAILED
INFEASIBLE
VALIDATED
ENGINEERING APPROVED

Do not use VALIDATED for a surrogate training metric.

## Empty state
If there are no runs, show an honest empty state.

## Failure state
Show backend/evaluator failures clearly; never substitute made-up values.
