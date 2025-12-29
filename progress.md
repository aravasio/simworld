# Progress Log

## Overview
This file tracks engine milestones and current architecture choices. Keep it updated as the sim grows.

## Current State
- Deterministic fixed-step loop wired with pause/resume/step controls.
- Pixi renderer draws a fixed-size grid, glyphs, and cursor overlay.
- Actors model unified: all in-world things are actors with component maps.
- Actor components are created via the `ActorComponents` catalog.
- Inspector shows info under cursor (name/glyph/position + vitals when present).
- Move mode via Space with red border cue; blocked moves show status message.
- Move/mine commands run through sim step (command queue).

## Actor Model (Current)
- Actor is just `{ id }`.
- Components live in maps: `positions`, `renderables`, `tags`, `vitals`, `kinds`, `selectables`, `targetables`, `passability`.
- `createActor(state, actor, components)` applies a list of components.
- `kind` is a component, not a field.
- Vitals is a single unified component (no stats/current split).
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
- Consider removing `let` state in `src/main.ts` in favor of functional pipelines.
