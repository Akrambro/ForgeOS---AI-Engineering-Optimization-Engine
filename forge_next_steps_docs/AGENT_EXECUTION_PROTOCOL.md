# ForgeOS — AI Coding Agent Execution Protocol

## Read before coding
- MASTER_SPEC.md
- ENGINEERING_CRITIQUE.md
- ARCHITECTURE.md
- SCIENTIFIC_RULES.md
- CODING_RULES.md
- PHASE_01_CORE_ENGINE.md

## Workflow
SPEC -> PLAN -> IMPLEMENT -> TEST -> INSPECT -> REPORT -> STOP

## One task at a time
A user instruction defines the task boundary. Never implement the whole phase from one sentence.

## Ambiguity
If implementation-local, choose the safest minimal interpretation and record it. If material to scientific behavior, stop and ask.

## Out of scope
Record future ideas; do not implement them.

## Before completion
Run:
- unit tests
- integration tests
- lint
- type checks
- applicable benchmark

## Report
PHASE:
TASK:
CHANGED:
TESTS:
BENCHMARKS:
KNOWN LIMITATIONS:
ENGINEERING RISKS:
OUT OF SCOPE:
STATUS:

Then STOP.

## Forbidden
- invented engineering facts
- fabricated benchmark results
- silent dependency additions
- unrelated refactors
- hidden failures
- fake validation
- speculative simulator integrations
