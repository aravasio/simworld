// Entry point wiring: boots the world/agents, renderer, loop, and debug UI.
// Purpose: demonstrate how the pieces connect; replace bootstrap details as the project evolves.
import { createWorld, TileFlag, inBounds } from './world';
import { createAgents, addAgent } from './agents';
import { createDebugUI } from './ui';
import { FixedStepLoop } from './loop';
import { Renderer } from './renderer/renderer';
import { PixiBackend } from './renderer/pixi';
import { RngSeed } from './rng';
import { GameState } from './sim';

function bootstrap() {
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas #viewport not found');
  }

  const worldSize = { width: 7, height: 7 };
  const world = createWorld(worldSize, 0, TileFlag.Walkable);
  const center = { x: Math.floor(worldSize.width / 2), y: Math.floor(worldSize.height / 2) };

  let agents = createAgents();
  agents = addAgent(agents, { id: 1, x: center.x - 1, y: center.y, glyphId: 1 }); // Green X to the left
  agents = addAgent(agents, { id: 2, x: center.x + 1, y: center.y, glyphId: 2 }); // Red Y to the right

  const initialState: GameState = { world, agents, tick: 0 };
  let rngSeed: RngSeed = 12345;

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
  const cursor = { x: center.x - 1, y: center.y }; // start cursor on X
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

  const updateInspector = () => {
    if (!inspector.name || !inspector.glyph || !inspector.pos || !inspector.avatar) return;
    const agent = agents.agents.find((a) => a.x === cursor.x && a.y === cursor.y);
    if (agent) {
      inspector.name.textContent = `Agent ${agent.id}`;
      const char = glyphChar(agent.glyphId);
      inspector.glyph.textContent = char;
      inspector.avatar.textContent = char;
      (inspector.avatar as HTMLElement).style.color = glyphColor(agent.glyphId);
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
