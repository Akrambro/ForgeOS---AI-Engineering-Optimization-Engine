# ForgeOS — Architecture

## Initial architecture
Use a modular monolith plus worker execution.

React frontend
-> FastAPI
-> PostgreSQL
-> job/worker layer
-> optimization core
-> evaluation adapter

Do not introduce microservices just because the future platform may be large.

## Modules
backend/
- api/
- schemas/
- services/
- core/problem/
- core/candidate/
- core/evaluation/
- core/optimization/
- core/results/
- algorithms/
- adapters/
- persistence/
- execution/

## Evaluation boundary
The optimizer depends only on an EvaluationAdapter interface.

Conceptual contract:
```python
class EvaluationAdapter:
    def evaluate(self, candidate) -> EvaluationResult:
        ...
```

## Evaluation states
QUEUED -> RUNNING -> SUCCEEDED / FAILED / TIMEOUT / CANCELLED

A successful evaluation is separately classified FEASIBLE or INFEASIBLE.

## Run immutability
Snapshot:
- problem version
- evaluator identity/version
- algorithm/configuration
- seed
- dataset/model version if applicable
- code version
- relevant environment fingerprint

## External adapter requirements
Later adapters must support:
- input generation
- isolated work directory
- process lifecycle
- timeout
- cancellation
- stdout/stderr
- convergence status
- result extraction
- stale-output detection
- artifacts
- checksums
- version capture

## Artifact rule
Large solver outputs belong in object/file storage abstraction, not relational rows.

## Failure rule
A simulator crash is not automatically “infeasible.” Preserve SIMULATOR_FAILED separately from SUCCEEDED+INFEASIBLE.
