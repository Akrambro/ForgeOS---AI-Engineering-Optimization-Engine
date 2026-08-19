# Phase 09 — Robust Engineering Optimization

## Engineering critic verdict

### Main risk
Optimizing a brittle nominal point.

### Real engineering variation
- manufacturing tolerances;
- ambient conditions;
- parameter uncertainty;
- aging;
- measurement error;
- model uncertainty.

## Objective

Optimize not only nominal performance but acceptable behavior across defined variation.

## Scope

- uncertain parameter definitions
- scenarios/samples
- robustness metrics
- worst-case or stochastic objective formulations
- sensitivity analysis
- scenario generation

## Example

Instead of:

```text
minimize temperature at nominal ambient
```

evaluate:

```text
ambient range
coolant variation
material tolerance
sensor variation
```

and optimize:
- expected value;
- percentile;
- worst-case within defined region;
- probability of constraint satisfaction.

## Engineering guard

Do not claim "robust" without defining:
- uncertainty distribution/range;
- sampling method;
- confidence/coverage;
- intended use.

## Tasks

T01 uncertainty schema
T02 scenario generator
T03 robust objective wrapper
T04 sensitivity metrics
T05 convergence/variance tests
T06 pilot regression

## Exit gate

A robust candidate must demonstrate acceptable behavior across the declared uncertainty set and remain feasible under required scenarios.
