# ForgeOS — Master Phase Acceptance Matrix

| Phase | Primary proof | Hard blocker before next phase |
|---|---|---|
| 01 Core | reproducible real run | failures/constraints/reproducibility unresolved |
| 02 Benchmark | repeatable comparisons | benchmark protocol not controlled |
| 03 BO | expensive-search benefit | no demonstrated benefit or unstable numerics |
| 04 Surrogate | credible holdout/local validation | model only measured on training set |
| 05 Truth-guided | lower truth cost | surrogate exploitation/uncontrolled extrapolation |
| 06 Multi-objective | explicit decision record | hidden weighting |
| 07 Simulator | reproducible adapter | stale/ambiguous outputs |
| 08 Daitya | measured pilot benefit | no trusted baseline/approval |
| 09 Robust | acceptable uncertainty margins | nominal-only optimum |
| 10 HIL | safe audited experiment | unsafe/unbounded actuation |
| 11 RL | validated constrained policy | RL not better or unsafe |
| 12 Autonomous | bounded audited campaign | autonomy bypasses controls |

## Universal gate

No phase can be accepted if:
- tests fail;
- scientific claims are unsupported;
- evaluator failures are hidden;
- configuration cannot be reproduced;
- out-of-scope features were silently added;
- the current phase depends on an undocumented assumption.
