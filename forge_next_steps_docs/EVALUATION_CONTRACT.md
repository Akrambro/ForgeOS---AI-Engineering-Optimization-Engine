# ForgeOS — Evaluation Contract

## Candidate
Immutable variable mapping validated before execution.

## Result
Conceptual schema:
```json
{
  "status": "SUCCEEDED",
  "objectives": {"objective_1": 0.123},
  "constraints": {"constraint_1": 0.4},
  "diagnostics": {"solver_converged": true},
  "duration_seconds": 12.3
}
```

## Status
- SUCCEEDED
- FAILED
- TIMEOUT
- CANCELLED

## Feasibility
Calculated only after a successful valid result.

Failed:
- status = FAILED
- feasibility = UNKNOWN

Succeeded but violating a constraint:
- status = SUCCEEDED
- feasibility = INFEASIBLE

## Diagnostics
May contain solver convergence, residual norm, iteration count, warning count, mesh quality and checksums.

## External adapters later
Must support:
- input generation
- work isolation
- timeout
- cancellation
- output capture
- result extraction
- artifact capture
- version capture

## Reproducibility
Deterministic evaluators should reproduce within stated numerical tolerance. Stochastic evaluators should expose controlled randomness where possible.

## Security
Never permit arbitrary API-supplied shell commands. External adapters must be explicitly registered/authorized.
