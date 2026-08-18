# Architectural Decision Records (ADR)

## ADR 1: Separation of Optimizer and Evaluator
- **Context**: Engineering optimization problems involve diverse simulators (Python functions, external executables, CFD, physical tests). Coupling optimizers to simulators leads to rigid, unmaintainable codebases.
- **Decision**: Implement a strict `EvaluationAdapter` contract. Optimizers interact only with abstract evaluation calls that return objective and constraint values.
- **Status**: Accepted

## ADR 2: Modular Monolith + Worker Architecture
- **Context**: Long-running simulations and optimization trials must not block the API or web frontend.
- **Decision**: Structure the backend as a modular monolith with asynchronous job execution workers, persisting trials incrementally to PostgreSQL.
- **Status**: Accepted

## ADR 3: Use of Mature Scientific Libraries
- **Context**: Implementing optimization algorithms (Differential Evolution, TPE, Bayesian Optimization, NSGA-II) from scratch introduces numerical risks and maintenance overhead.
- **Decision**: Wrap established Python scientific libraries (`pymoo`, `Optuna`, `BoTorch`, `SciPy`) behind clean domain interfaces.
- **Status**: Accepted
