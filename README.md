# Sandbox Sim

A tiny deterministic, grid-based simulation engine with a minimal UI. The sim is authoritative; the UI only renders state and displays sim feedback.

## Features (Current)
- Deterministic sim step with explicit commands and diffs
- Actor component model (positions, vitals, contents, stackables, etc.)
- Mining rocks, opening chests, smashing targets, picking up items
- Basic inventory via actor contents
- Pixi-backed renderer with glyph mapping

## Controls
- Move cursor: `WASD` / Arrow keys
- Move mode: `Enter` / `E`
- Mine: `I`
- Open chest: `O`
- Smash: `F`
- Pick up item: `G`
- Cancel move: `Esc`
- Pause/resume: `Space`
- Step once (paused): `Ctrl+Space`

## Run
```
npm install
npm test
```

## Project Docs
- Architecture + rules: `docs/AGENTS.md`
- Engine spec: `docs/engine-spec.md`
- Progress log: `docs/progress.md`

## Structure
- `src/sim`: rules, validation, state transitions, diffs
- `src/actors`: components, selectors, mutations
- `src/world`: terrain data + accessors (no rules)
- `src/input`: key/intent mapping (pure)
- `src/renderer`: renderer + Pixi backend
- `src/inspector`: DOM inspector (display only)
- `src/bootstrap`: initial world/actors setup
