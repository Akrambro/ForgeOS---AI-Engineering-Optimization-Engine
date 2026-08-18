# Project Specification: AI Engineering Optimization Engine

## 1. Executive Summary
The **AI Engineering Optimization Engine** is a scientifically rigorous optimization platform designed for engineering design, calibration, and control problems. It provides a modular, extensible architecture separating optimization algorithms from evaluation adapters (such as deterministic Python functions, external simulators, CFD, FEA, or physical tests).

## 2. Core Product Principle
The central abstraction of the platform is:
```text
INPUT VECTOR
      ↓
EVALUATION ADAPTER
      ↓
OBJECTIVES + CONSTRAINTS
```
- **Independence**: The optimizer never depends directly on a particular simulator. The simulator never depends directly on a particular optimization algorithm.
- **Scientific Integrity**: No fabricated results, strict constraint handling, explicit trial logging, reproducibility via random seeds, and uncertainty quantification in surrogate models.

## 3. Domain Entities
- **Problem**: Defines the optimization namespace, version, variables, objectives, constraints, and evaluation adapter.
- **Variable**: Continuous, integer, or categorical parameters with bounds, defaults, units, and descriptions.
- **Objective**: Direction (minimize/maximize), unit, and description.
- **Constraint**: Mathematical operators (`<=`, `>=`, `==`) against thresholds.
- **OptimizationRun**: Execution instance with algorithm, seed, budget, status, and timestamps.
- **Trial**: Individual parameter evaluation record with objective values, constraint values, feasibility, duration, status, error, and timestamp.
- **Result**: Summary containing best feasible solution, Pareto front (multi-objective), constraint status, evaluation count, and termination reason.

## 4. Evaluation Adapter Contract
All evaluation backends implement a standard interface returning an `EvaluationResult` containing objective values, constraint values, metadata, duration, and status (successful, failed, timeout, constraint violation, invalid input, numerical failure).

## 5. Algorithmic Foundation
Leverages mature scientific libraries (`pymoo`, `Optuna`, `BoTorch`) wrapped in a unified execution runner supporting:
- Random Search
- Differential Evolution (DE)
- Tree-structured Parzen Estimators (TPE)
- Bayesian Optimization
- NSGA-II (Multi-Objective)
- Gaussian Process Surrogates & Active Learning
