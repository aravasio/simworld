# Progress Log

## Overview
This file tracks engine milestones and current architecture choices. Keep it updated as the sim grows.

## Current State
- Deterministic fixed-step loop wired with pause/resume/step controls (Space toggles pause, Ctrl+Space steps when paused).
- Pixi renderer draws a fixed-size grid, glyphs, and cursor overlay.
- Actors model unified: all in-world things are actors with component maps.
- Actor components are created via the `ActorComponents` catalog.
- Inspector shows info under cursor (name/glyph/position + vitals when present).
- Move mode via Enter/E with red border cue; blocked moves show status message.
- Move/mine commands run through sim step (command queue).
- Sim returns command results (ok/error + reason) for UI feedback.
- Input handling factored into a pure mapper (`src/input/input.ts`) for testability.
- App wiring split into modules (bootstrap, input, inspector, ui, sim).
- Minimal test harness in `tests/` covering pathfinding, movement, mining, input mapping, and world rules.

## Actor Model (Current)
- Actor is just `{ id }`.
- Components live in maps: `positions`, `renderables`, `tags`, `vitals`, `hitPoints`, `locks`, `contents`, `stackables`, `kinds`, `selectables`, `targetables`, `passability`, `paths`.
- `createActor(state, actor, components)` applies a list of components.
- `kind` is a component, not a field.
- Vitals is a single unified component (no stats/current split).
- Contents stores item actor references as stack/single slots.
- Target priority uses first actor match in list order (temporary).

## Gameplay Stubs
- Two dwarf creatures (X/Y) at bottom row.
- Rocks at top row; mining drops 1–5 rock-material.
- Contextual action hints under the grid (keyboard-driven).

## UI Layout
- Top full-width control bar.
- Map + inspector stacked horizontally, inspector fixed width on the right.
- Flat, low-poly palette; no background image.

## Open Questions / Next Steps
- Decide on validation strategy for component rules (e.g., creature requires vitals).
- Define walkability/solidity rules using tags or a dedicated component (passability exists but is ad-hoc).
- Decide render ordering for stacked actors (items vs. rocks vs. creatures).
- Strengthen FP guarantees by ensuring component maps are always copied on write.
- Consider reducing mutable state in `src/app.ts` as sim queries expand.
- Grow test coverage to include larger world configs and scenario snapshots.
