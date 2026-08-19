# ForgeOS — Coding Rules for AI Coding Agents

## Scope
Never implement a future phase without explicit authorization.

## Anti-hallucination
Never invent simulator APIs, engineering constants, physical equations, benchmark results, validation claims or external tool behavior.

## Architecture
Do not add microservices, LLM agents, RAG, Kubernetes or new major dependencies unless the current phase requires them.

## Scientific code
Every numerical/optimization component needs:
- unit tests
- seeded deterministic tests where applicable
- boundary tests
- invalid-input tests
- regression tests

## State
Use explicit state machines for run/evaluation status.

## Configuration
Algorithm and evaluator configuration must be explicit and validated.

## Immutability
Once a run begins, its configuration is immutable.

## Errors
Never swallow exceptions or convert evaluator failures into fake objective values.

## Numerical hygiene
Check NaN, infinity, invalid dimensions and invalid ranges.

## Reproducibility
Every stochastic run has an explicit persisted seed.

## API
Use typed request/response schemas. Never expose arbitrary Python objects or command execution.

## Agent stopping protocol
At the end of every task:
1. run tests
2. run lint
3. run type checks
4. inspect changed files
5. report changes/failures/risks
6. STOP

A smaller correct implementation is better than speculative breadth.
