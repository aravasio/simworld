# Dwarf-Fortress-Like Engine Spec (TypeScript, Web-First, Deterministic, Functional)

## Vision
A tiny, purpose-built engine for deterministic grid-world simulation: the world is authoritative data; the sim evolves it via pure steps; rendering is just a projection. One Z-level now, fixed timestep, explicit RNG seed, integer math. Minimal dependencies, all hidden behind adapters so we can swap Pixi for WebGL later without touching engine code. Start with simple wandering agents; grow deliberately.

## Core Principles
- **Pure and deterministic**: state + commands + rngSeed -> nextState + nextSeed + diff; no floats; fixed tick order.
- **Data-first**: world and agents are dense data with semantic lookups; behavior lives in sim, not in render.
- **Narrow interfaces**: world/agents via accessors; sim consumes/produces data; renderer uses a backend interface; dependencies do not leak.
- **Small start, open future**: one layer, minimal pathfinding, no ECS/chunking; APIs leave room for entities, spells, more layers later.

## Data Model (What/Why)
- **WorldState**
  - Purpose: authoritative grid of terrain and per-tile properties.
  - Contents: width, height; terrainTypeId: Uint16Array (what terrain is here); flags: Uint16Array (bitmask for quick properties like walkable/opaque).
  - Rationale: terrainTypeId ties into a terrain table for meaning (name, glyph, passability, hp, etc.); flags compress frequent booleans for fast queries while keeping meaning in the table; accessors prevent raw poking.
- **TerrainTypeTable**
  - Purpose: semantic meaning for each terrainTypeId.
  - Contents: entries like { name, glyphId, walkable, opaque, hp?, flammability?, moveCost?, tags? }.
  - Rationale: keeps per-tile storage lean while preserving clarity and debuggability.
- **ActorsState** (unified in-world entities)
  - Purpose: all in-world things are actors with composable components.
  - Contents: Actor { id } plus component maps (position, renderable, vitals, tags, kind, selectability, passability, path, etc.).
  - Rationale: removes agent/entity split; components compose behavior while keeping storage explicit and deterministic.
- **GameState**
  - Purpose: the whole sim snapshot.
  - Contents: { world: WorldState, actors: ActorsState, tick: number, nextActorId: number }.
  - Rationale: one object to pass through pure functions; easy to serialize/inspect.
- **RngSeed**
  - Purpose: explicit deterministic randomness.
  - Contents: integer seed threaded through nextInt/nextFloat returning { value, nextSeed }.
  - Rationale: no globals; reproducible sequences.

## Commands and Mutations (What/Why)
- **Commands** (inputs)
  - Examples: Move { actorId, dir }, MoveTo { actorId, x, y }, Mine { actorId }, Wait { actorId }.
  - Rationale: explicit intents from player/AI; ordered processing for determinism.
- **Mutations** (state changes)
  - Examples: ActorMoved { actorId, from, to }, ActorAdded/Removed, PathSet, TileChanged { x, y, terrainTypeId?, flagsMask?, flagsOp }.
  - Rationale: make state transitions data; testable; easy to log/replay.

## Simulation Step (What/Why)
- Signature: step(gameState, commands, rngSeed) -> { nextState, nextSeed, diff }.
- Phases:
  1) Derive Mutation[] from commands + AI/random (advancing seed).
  2) Apply mutations to produce nextState (copy-on-write; reuse buffers when untouched).
  3) Build diff for renderer (tick, actorMoves, tileChanges, actorsAdded/Removed).
- Rationale: keeps sim pure, deterministic, inspectable; diff avoids re-reading full state for render.

## Renderer (What/Why)
- **Renderer interface**
  - Methods: init(tilesetMeta), setWorld(WorldState), applyDiff(diff), render(), destroy().
  - Rationale: engine-facing contract; render is a projection only.
- **RenderBackend interface**
  - Methods: loadTexture, createTileLayer, createAgentLayer, updateTileLayer, updateAgentLayer, draw, destroy.
  - Rationale: hides Pixi/WebGL; swap backends without touching renderer logic.
- **TilesetMeta**
  - Maps glyphId -> UV coords, atlas image path.
  - Rationale: decouples glyph meaning from draw tech.
- Behavior: static tile layer rebuilt only on tile changes; agent layer updated per tick; renderer never mutates sim.
- Rationale: performance via batching; clarity via separation.

## Loop (What/Why)
- Purpose: fixed-step orchestrator with pause/speed/step.
- Behavior: requestAnimationFrame accumulator; while accum >= stepMs*speed, call step; after stepping, call renderer.render().
- Controls: start, pause, resume, setSpeed(mult), stepOnce, onTick(cb).
- Rationale: deterministic sim cadence; supports debugging controls.

## Debug UI (What/Why)
- Purpose: simple controls to drive the loop and observe tick.
- Behavior: DOM buttons (pause/resume, step, speed select); display tick counter.
- Rationale: no framework; keeps UI separate from sim.

## Project Structure (What/Why each file)
- src/world/: WorldState + queries + mutation helpers; enforces narrow access.
- src/actors/: Actor state, component catalog, selectors, mutations.
- src/sim/: command/mutation types, step, and system helpers (movement/mining/pathing).
- src/input/: key mapping (pure) and input types.
- src/inspector/: DOM inspector wiring (display only).
- src/ui/: debug UI wiring (loop controls + tick display).
- src/renderer/renderer.ts: renderer interface, diff handling; engine-facing view layer.
- src/renderer/backend.ts: RenderBackend interface; abstraction boundary for dependencies.
- src/renderer/pixi.ts: Pixi implementation of RenderBackend; dependency kept contained.
- src/loop.ts: fixed-step loop implementation; time and controls glue.
- src/bootstrap/: initial world + actor setup helpers.
- src/app.ts: runtime wiring and orchestration.
- src/main.ts: minimal entry point.

## Design Rationale Summary
- Determinism: fixed step, integer math, explicit RNG seed, ordered command handling.
- Clarity: semantic terrainTypeId + terrain table; flags for speed with debug helpers.
- Isolation: dependencies hidden behind interfaces; renderer cannot touch sim state.
- Functional flow: state in/out, mutations as data; easy to test/log/replay.
- Small surface: only what’s needed for a tiny deterministic sim; APIs leave room for entities/spells/more layers later.

## Phase 2 / Potential TODOs
- Decide flags encoding: keep Uint16 mask + debug printer, or split into separate arrays for maximum explicitness.
- Extend targeting: add EntityState for non-mover interactables (walls/items) or unify movers/entities with moveSpeed=0 and walkable flag; ensure tile-centric targeting supports spells on walls.
- Elaborate command set: add Attack, CastSpell, UseItem; define their mutations and ordering rules.
- Add more layers: optional z parameter in world accessors, stored as single layer for now; plan layout for future multi-Z.
- Render backend swap: implement a WebGLBackend to validate the adapter boundary.
- Persistence/replay: log commands and rngSeed per tick to reproduce runs.
- Profiling: tune copy-on-write strategy (which buffers clone) once size/perf constraints are known.
