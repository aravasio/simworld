// Entry point wiring: boots the world/agents, renderer, loop, and debug UI.
// Purpose: demonstrate how the pieces connect; replace bootstrap details as the project evolves.
import { createWorld, TileFlag, inBounds } from './world';
import {
  createActors,
  createActor,
  removeActor,
  ActorsState,
  Actor,
  getPosition,
  getRenderable,
  getTags,
  getKind,
  ActorComponents,
} from './actors';
import { createDebugUI } from './ui';
import { FixedStepLoop } from './loop';
import { Renderer } from './renderer/renderer';
import { PixiBackend } from './renderer/pixi';
import { RngSeed, nextInt } from './rng';
import { GameState } from './sim';

function bootstrap() {
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas #viewport not found');
  }

  const worldSize = { width: 7, height: 7 };
  const world = createWorld(worldSize, 0, TileFlag.Walkable);
  const center = { x: Math.floor(worldSize.width / 2), y: Math.floor(worldSize.height / 2) };
  const bottomY = worldSize.height - 1;

  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x - 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 1 }),
    ActorComponents.vitals({ maxHp: 10, maxMp: 5, maxStamina: 8, hp: 10, mp: 5, stamina: 8 }),
    ActorComponents.tags(['dwarf']),
  ]); // Green X to the left
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x + 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 2 }),
    ActorComponents.vitals({ maxHp: 10, maxMp: 5, maxStamina: 8, hp: 10, mp: 5, stamina: 8 }),
    ActorComponents.tags(['dwarf']),
  ]); // Red Y to the right

  let nextActorId = 100;
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: center.x - 1, y: 0 }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable', 'solid']),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: center.x + 1, y: 0 }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable', 'solid']),
  ]);

  const initialState: GameState = { world, actors, tick: 0 };
  let rngSeed: RngSeed = 12345;
  let dropSeed: RngSeed = 7777;

  const backend = new PixiBackend();
  const renderer = new Renderer({
    backend,
    canvas,
    tileset: { atlasUrl: '', glyphs: {} },
  });

  renderer.setWorld(world, (terrainId) => terrainId);
  const renderables = Array.from(initialState.actors.actors).map((actor) => {
    const pos = getPosition(initialState.actors, actor.id);
    const rend = getRenderable(initialState.actors, actor.id);
    return {
      id: actor.id,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      glyphId: rend?.glyphId ?? 0,
    };
  });
  backend.setActors(renderables);
  const cursor = { x: center.x - 1, y: bottomY }; // start cursor on X
  backend.setCursorPosition(cursor.x, cursor.y);
  const inspector = {
    name: document.getElementById('inspector-name'),
    glyph: document.getElementById('inspector-glyph'),
    avatar: document.getElementById('inspector-avatar'),
    pos: document.getElementById('inspector-pos'),
    sidebar: document.getElementById('sidebar'),
    ui: document.getElementById('ui'),
  };

  const actorGlyphChar = (glyphId: number) => {
    switch (glyphId) {
      case 1:
        return 'X';
      case 2:
        return 'Y';
      case 3:
        return '#';
      case 4:
        return '*';
      default:
        return '?';
    }
  };
  const actorGlyphColor = (glyphId: number) => {
    switch (glyphId) {
      case 1:
        return '#4ade80';
      case 2:
        return '#f87171';
      case 3:
        return '#9ca3af';
      case 4:
        return '#c58a2d';
      default:
        return '#9ba4b0';
    }
  };

  const findActorAt = (state: ActorsState, x: number, y: number): Actor | undefined => {
    for (const actor of state.actors) {
      const pos = state.positions.get(actor.id);
      if (pos && pos.x === x && pos.y === y) return actor;
    }
    return undefined;
  };

  const updateInspector = () => {
    if (!inspector.name || !inspector.glyph || !inspector.pos || !inspector.avatar) return;
    const actor = findActorAt(actors, cursor.x, cursor.y);
    if (actor) {
      const kind = getKind(actors, actor.id);
      if (kind === 'rock') {
        inspector.name.textContent = 'Rock';
      } else if (kind === 'rock-material') {
        inspector.name.textContent = 'Rock Material';
      } else {
        const tags = getTags(actors, actor.id);
        inspector.name.textContent = tags?.has('dwarf') ? `Dwarf ${actor.id}` : `Creature ${actor.id}`;
      }
      const rend = getRenderable(actors, actor.id);
      const glyphId = rend?.glyphId ?? 0;
      const char = actorGlyphChar(glyphId);
      inspector.glyph.textContent = char;
      inspector.avatar.textContent = char;
      (inspector.avatar as HTMLElement).style.color = actorGlyphColor(glyphId);
    } else {
      inspector.name.textContent = 'None';
      inspector.glyph.textContent = '-';
      inspector.avatar.textContent = '?';
      (inspector.avatar as HTMLElement).style.color = '#9ca3af';
    }
    inspector.pos.textContent = `${cursor.x}, ${cursor.y}`;
  };

  const loop = new FixedStepLoop(
    { stepMs: 1000 / 10 },
    initialState,
    rngSeed,
    {
      getCommands: () => [],
      onAfterStep: (result) => {
        renderer.applyDiff(
          result.diff,
          (terrainId) => terrainId,
          (actorId) => {
            const rend = getRenderable(actors, actorId);
            return rend?.glyphId ?? 0;
          }
        );
      },
      onRender: () => renderer.draw(),
    }
  );
  // Start paused so simulation does not advance until user resumes.
  loop.pause();

  createDebugUI({
    loop,
    getState: () => loop.getState(),
  });

  const moveCursor = (dx: number, dy: number) => {
    const nx = cursor.x + dx;
    const ny = cursor.y + dy;
    if (!inBounds(world, nx, ny)) return;
    cursor.x = nx;
    cursor.y = ny;
    backend.setCursorPosition(cursor.x, cursor.y);
  };

  const refreshActors = () => {
    const visuals = actors.actors.map((actor) => {
      const pos = getPosition(actors, actor.id);
      const rend = getRenderable(actors, actor.id);
      return {
        id: actor.id,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        glyphId: rend?.glyphId ?? 0,
      };
    });
    backend.setActors(visuals);
  };

  const mineRockAtCursor = () => {
    const target = findActorAt(actors, cursor.x, cursor.y);
    const kind = target ? getKind(actors, target.id) : undefined;
    if (!target || kind !== 'rock') return;
    actors = removeActor(actors, target.id);
    const roll = nextInt(dropSeed, 5);
    dropSeed = roll.nextSeed;
    const count = roll.value + 1;
    for (let i = 0; i < count; i++) {
      actors = createActor(actors, { id: nextActorId++ }, [
        ActorComponents.kind('rock-material'),
        ActorComponents.position({ x: cursor.x, y: cursor.y }),
        ActorComponents.renderable({ glyphId: 4 }),
        ActorComponents.tags(['item']),
      ]);
    }
    refreshActors();
    updateInspector();
  };

  window.addEventListener('keydown', (event) => {
    let handled = true;
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        moveCursor(0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        moveCursor(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        moveCursor(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        moveCursor(1, 0);
        break;
      case 'm':
      case 'M':
        mineRockAtCursor();
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
    updateInspector();
  });

  updateInspector();
  loop.start();
}

document.addEventListener('DOMContentLoaded', bootstrap);
