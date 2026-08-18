# Architecture: AI Engineering Optimization Engine

## 1. Architectural Style
The system is built as a **Modular Monolith with Worker Architecture**, separating the API request lifecycle from long-running optimization evaluations.

```text
Frontend (React + Vite)
       ↕ REST API / WebSocket
API Layer (FastAPI / Express Server)
       ↓ Job Queue / Scheduler
Worker Execution Engine
       ↓
Optimizer Layer (pymoo / Optuna / BoTorch)
       ↓
Evaluation Adapter (Python / Command)
       ↓
Storage Layer (PostgreSQL / SQLAlchemy)
```

## 2. Directory Structure
```text
project/
├── apps/
│   ├── api/          # REST endpoints & router handlers
│   └── web/          # React TypeScript dashboard & visualization UI
├── core/
│   ├── problem/      # Problem definition domain logic
│   ├── variables/    # Variable bounds & validation
│   ├── objectives/   # Objective directions
│   ├── constraints/  # Constraint operators & evaluation
│   ├── evaluation/   # Evaluation adapter interface & base classes
│   ├── experiments/  # Experiment history & trial logging
│   ├── optimization/ # Optimization run orchestration
│   ├── surrogate/    # Gaussian Process & surrogate models
│   └── results/      # Result aggregation & Pareto front calculation
├── algorithms/
│   ├── random_search/
│   ├── evolutionary/ # Differential Evolution, NSGA-II
│   ├── bayesian/
│   └── tpe/
├── adapters/
│   ├── base/
│   ├── python/       # PythonFunctionAdapter
│   └── command/      # CommandLineAdapter
├── execution/
│   ├── jobs/
│   ├── workers/
│   └── scheduler/
├── storage/          # DB models & session management
├── benchmarks/       # Benchmark suites (A-E, EV Thermal)
├── tests/            # Unit, integration, and scientific regression tests
├── docs/
└── scripts/
```

## 3. Database Schema (PostgreSQL)
- **problems**: id, name, description, version, created_at
- **variables**: id, problem_id, name, type, lower_bound, upper_bound, default_value, unit, description
- **objectives**: id, problem_id, name, direction, unit, description
- **constraints**: id, problem_id, name, operator, threshold, unit, description
- **optimization_runs**: id, problem_id, algorithm, seed, budget, status, started_at, completed_at
- **trials**: id, run_id, parameters (json), objective_values (json), constraint_values (json), feasible (bool), evaluation_duration, status, error, timestamp
- **benchmark_runs**: id, benchmark_name, algorithm, metrics (json), timestamp
