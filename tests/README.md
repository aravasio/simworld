# Tests

## Goals
- Keep tests deterministic and fast (pure modules, no DOM/Pixi).
- Exercise the current "reference world" behavior: movement, mining, pathing, RNG.
- Make it easy to extend into larger world configs later.

## How to run
```
npm test
```

## Strategy (now)
- **Unit tests**: pathfinding behavior, input mapping, and world walkability rules.
- **Sim tests**: command handling + diff generation + one-step path consumption.
- **Determinism checks**: same state + commands + seed must produce the same diff.
- **Gameplay rules**: mining adjacency (including diagonals) and drop range.

## Strategy (later)
- Add larger world fixtures and verify config consistency (bounds, walkable flags, spawn rules).
- Add integration "scenario" tests: command scripts + golden snapshots of positions/ticks.
- Expand to performance checks once map size or actor count grows.
