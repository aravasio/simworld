// Entry point wiring: boots the world/agents, renderer, loop, and debug UI.
// Purpose: demonstrate how the pieces connect; replace bootstrap details as the project evolves.
import { createWorld, TileFlag, inBounds } from './world';
import { createAgents, addAgent } from './agents';
import { createEntities, addEntity, removeEntity, updateEntity, EntitiesState, Entity } from './entities';
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

  let agents = createAgents();
  agents = addAgent(agents, { id: 1, x: center.x - 1, y: bottomY, glyphId: 1 }); // Green X to the left
  agents = addAgent(agents, { id: 2, x: center.x + 1, y: bottomY, glyphId: 2 }); // Red Y to the right

  let entities = createEntities();
  let nextEntityId = 100;
  entities = addEntity(entities, {
    id: nextEntityId++,
    x: center.x - 1,
    y: 0,
    glyphId: 3,
    kind: 'rock',
    hp: 3,
  });
  entities = addEntity(entities, {
    id: nextEntityId++,
    x: center.x + 1,
    y: 0,
    glyphId: 3,
    kind: 'rock',
    hp: 3,
  });

  const initialState: GameState = { world, agents, entities, tick: 0 };
  let rngSeed: RngSeed = 12345;
  let dropSeed: RngSeed = 7777;

  const backend = new PixiBackend();
  const renderer = new Renderer({
    backend,
    canvas,
    tileset: { atlasUrl: '', glyphs: {} },
  });

  renderer.setWorld(world, (terrainId) => terrainId);
  backend.setAgents(
    initialState.agents.agents.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      glyphId: a.glyphId,
    }))
  );
  backend.setEntities(
    entities.entities.map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      glyphId: e.glyphId,
    }))
  );
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

  const glyphChar = (glyphId: number) => (glyphId === 1 ? 'X' : 'Y');
  const glyphColor = (glyphId: number) => (glyphId === 1 ? '#4ade80' : '#f87171');
  const entityGlyphChar = (glyphId: number) => {
    switch (glyphId) {
      case 3:
        return '#';
      case 4:
        return '*';
      default:
        return '?';
    }
  };
  const entityGlyphColor = (glyphId: number) => {
    switch (glyphId) {
      case 3:
        return '#9ca3af';
      case 4:
        return '#c58a2d';
      default:
        return '#9ba4b0';
    }
  };

  const findEntityAt = (state: EntitiesState, x: number, y: number): Entity | undefined =>
    state.entities.find((e) => e.x === x && e.y === y);

  const updateInspector = () => {
    if (!inspector.name || !inspector.glyph || !inspector.pos || !inspector.avatar) return;
    const agent = agents.agents.find((a) => a.x === cursor.x && a.y === cursor.y);
    const entity = agent ? undefined : findEntityAt(entities, cursor.x, cursor.y);
    if (agent) {
      inspector.name.textContent = `Agent ${agent.id}`;
      const char = glyphChar(agent.glyphId);
      inspector.glyph.textContent = char;
      inspector.avatar.textContent = char;
      (inspector.avatar as HTMLElement).style.color = glyphColor(agent.glyphId);
    } else if (entity) {
      inspector.name.textContent = entity.kind === 'rock' ? 'Rock' : 'Rock Material';
      const char = entityGlyphChar(entity.glyphId);
      inspector.glyph.textContent = char;
      inspector.avatar.textContent = char;
      (inspector.avatar as HTMLElement).style.color = entityGlyphColor(entity.glyphId);
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
          (agentId) => (agentId === 1 ? 1 : 2)
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

  const refreshEntities = () => {
    backend.setEntities(
      entities.entities.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        glyphId: e.glyphId,
      }))
    );
  };

  const mineRockAtCursor = () => {
    const target = findEntityAt(entities, cursor.x, cursor.y);
    if (!target || target.kind !== 'rock') return;
    const nextHp = (target.hp ?? 0) - 1;
    if (nextHp > 0) {
      entities = updateEntity(entities, target.id, (e) => ({ ...e, hp: nextHp }));
    } else {
      entities = removeEntity(entities, target.id);
      const roll = nextInt(dropSeed, 5);
      dropSeed = roll.nextSeed;
      const count = roll.value + 1;
      for (let i = 0; i < count; i++) {
        entities = addEntity(entities, {
          id: nextEntityId++,
          x: cursor.x,
          y: cursor.y,
          glyphId: 4,
          kind: 'rock-material',
        });
      }
    }
    refreshEntities();
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
