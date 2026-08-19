# ForgeOS — Master Specification

## Product
ForgeOS is an engineering optimization and evaluation-orchestration platform intended to reduce the number/cost of expensive evaluations needed to reach engineering targets.

## Core loop
Problem Definition -> Candidate -> Evaluation Adapter -> Result -> Run History -> Optimizer -> Next Candidate

## Non-goals
Initially not a CAD, PLM, CFD, FEA, ERP, digital-twin authoring, generic AI assistant, autonomous vehicle controller, or autonomous factory controller.

## Source-of-truth rule
The designated evaluator is the source of truth for an evaluated candidate. Surrogate predictions are never equivalent to truth evaluations.

## Terminology
- Candidate: variable values proposed for evaluation.
- Evaluation: one evaluator execution.
- Truth evaluation: authoritative evaluation for the use case.
- Failed evaluation: no valid engineering result produced.
- Infeasible evaluation: valid result that violates constraints.
- Surrogate prediction: model-generated estimate.
- Verification: implementation/model correctness relative to its specification.
- Validation: adequacy of the model/result for a defined intended use.
- Credibility: justified confidence that the model/simulation is appropriate for the decision.

## Phase 01 scope
- continuous variables
- integer variables where the selected algorithm supports them
- inequality constraints
- deterministic Python evaluators
- single-objective path
- persisted runs/trials
- seeded reproducibility

Future capabilities are separately gated.
