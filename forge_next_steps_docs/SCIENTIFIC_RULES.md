# ForgeOS — Scientific & Engineering Rules

1. Never invent physical relationships and present them as validated engineering knowledge.
2. Every engineering variable should have a unit or explicitly be dimensionless.
3. Distinguish Observed, Predicted, Simulated, Experimentally Measured, Validated and Unvalidated.
4. Verification, validation and credibility are separate concepts.
5. Surrogates must be validated on unseen data, not training data.
6. Detect and label extrapolation/out-of-domain use.
7. Do not call GP variance “engineering uncertainty” without definition.
8. Surrogate optimization must periodically call the truth evaluator.
9. Use trust-region/equivalent safeguards before relying on surrogate optima.
10. A hard constraint violation must be explicit.
11. A failed simulator is not automatically an infeasible design.
12. Robustness to tolerances/environment/aging should precede hardware deployment.
13. Stochastic benchmark claims require repeated runs or a predeclared protocol.
14. Optimize true engineering targets rather than easy-to-game proxies.
15. Maintain a validation matrix for every serious engineering use case.

Every important use case should record:
- intended use
- evaluator/model
- verification evidence
- validation evidence
- uncertainty
- limitations
- approval status
