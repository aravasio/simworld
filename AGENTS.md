# Agent Operating Rules

This document defines how to implement new features in this codebase. Treat it as the source of truth for architecture and style. When working with this project, follow these rules strictly.

## Core Architecture
- Sim is authoritative. The simulation decides what is valid, what changes, and why.
- App is a client. It submits commands, renders state, and displays sim feedback. It never enforces game rules.
- World is static terrain data + narrow accessors/mutations. It has no gameplay rules.
- Actors are composable components. Avoid ad-hoc properties outside component maps.

## Rule Ownership
- Game rules and validation live in `src/sim` (or sim-adjacent query helpers).
- UI may *ask* sim for eligibility or read sim-provided command results, but must not re-implement rules.
- If UI needs feedback (e.g., blocked move), that feedback must come from sim output (diff/commandResults).

## Command Flow
- UI emits intents -> App translates to commands -> Sim validates and applies.
- If a command is invalid, sim returns an error result and state remains unchanged.
- App only reacts to sim output: update visuals, show messages, update UI mode.

## Module Boundaries
- `src/sim`: rules, validation, state transitions, diff generation.
- `src/world`: terrain data + accessors, no rules.
- `src/actors`: components, selectors, mutations only.
- `src/input`: pure key/intent mapping.
- `src/inspector`: DOM rendering only, no rules.
- `src/ui`: loop controls only, no rules.
- `src/app`: composition glue; no rule logic.

## Style Constraints
- Prefer pure functions for logic modules.
- No side effects in sim/world/actors/input.
- Use existing component maps; do not add optional ad-hoc fields to actors.
- Keep public APIs narrow; expose helpers rather than sharing state.

## Change Discipline
- When adding features, first decide which module owns the rule.
- If a rule is required for UI, add it to sim (or sim query) and expose the result.
- Update tests for new behavior. Keep tests deterministic.
- Update docs (`engine-spec.md`, `progress.md`) when behavior or architecture changes.

## Review Checklist
Before shipping a change, confirm:
- No rule logic added to app or UI.
- Sim returns outcomes for any validation needed by UI.
- World/actors remain pure data + helpers.
- Tests cover new rules.
- Docs reflect the change.
