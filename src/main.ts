// Entry point wiring: boots the world/agents, renderer, loop, and debug UI.
// Purpose: demonstrate how the pieces connect; replace bootstrap details as the project evolves.
import { createWorld, TileFlag, inBounds, isWalkable } from './world';
import {
  createActors,
  createActor,
  ActorsState,
  Actor,
  getPosition,
  getRenderable,
  getTags,
  getKind,
  getVitals,
  getPassability,
  isSelectable,
  isTargetable,
  ActorComponents,
} from './actors';
import { createDebugUI } from './ui';
import { FixedStepLoop } from './loop';
import { Renderer } from './renderer/renderer';
import { PixiBackend } from './renderer/pixi';
import { RngSeed } from './rng';
import { Command, GameState } from './sim';

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
    ActorComponents.selectable(true),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]); // Green X to the left
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x + 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 2 }),
    ActorComponents.vitals({ maxHp: 10, maxMp: 5, maxStamina: 8, hp: 10, mp: 5, stamina: 8 }),
    ActorComponents.tags(['dwarf']),
    ActorComponents.selectable(true),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]); // Red Y to the right

  let nextActorId = 100;
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: center.x - 1, y: 0 }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable']),
    ActorComponents.targetable(true),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: center.x + 1, y: 0 }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable']),
    ActorComponents.targetable(true),
  ]);

  const initialState: GameState = { world, actors, tick: 0, nextActorId: nextActorId };
  let rngSeed: RngSeed = 12345;
  const commandQueue: Command[] = [];
  let currentState: GameState = initialState;

  const backend = new PixiBackend();
  const renderer = new Renderer({
    backend,
    canvas,
    tileset: { atlasUrl: '', glyphs: {} },
  });

  renderer.setWorld(world, (terrainId) => terrainId);
  const renderables = Array.from(currentState.actors.actors).map((actor) => {
    const pos = getPosition(currentState.actors, actor.id);
    const rend = getRenderable(currentState.actors, actor.id);
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
    hp: document.getElementById('inspector-hp'),
    mp: document.getElementById('inspector-mp'),
    stamina: document.getElementById('inspector-stamina'),
    vitals: document.getElementById('inspector-vitals'),
    actionHints: document.getElementById('action-hints'),
    status: document.getElementById('status-message'),
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
    // Target priority: first match in actor list.
    for (const actor of state.actors) {
      const pos = state.positions.get(actor.id);
      if (pos && pos.x === x && pos.y === y) return actor;
    }
    return undefined;
  };

  const updateInspector = () => {
    if (!inspector.name || !inspector.glyph || !inspector.pos || !inspector.avatar || !inspector.hp || !inspector.mp || !inspector.stamina || !inspector.vitals) return;
    const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
    if (actor) {
      const kind = getKind(currentState.actors, actor.id);
      if (kind === 'rock') {
        inspector.name.textContent = 'Rock';
      } else if (kind === 'rock-material') {
        inspector.name.textContent = 'Rock Material';
      } else {
        const tags = getTags(currentState.actors, actor.id);
        inspector.name.textContent = tags?.has('dwarf') ? `Dwarf ${actor.id}` : `Creature ${actor.id}`;
      }
      const rend = getRenderable(currentState.actors, actor.id);
      const glyphId = rend?.glyphId ?? 0;
      const char = actorGlyphChar(glyphId);
      inspector.glyph.textContent = char;
      inspector.avatar.textContent = char;
      (inspector.avatar as HTMLElement).style.color = actorGlyphColor(glyphId);
      const vitals = getVitals(currentState.actors, actor.id);
      if (vitals) {
        inspector.vitals.style.display = 'block';
        inspector.hp.textContent = `${vitals.hp}/${vitals.maxHp}`;
        inspector.mp.textContent = `${vitals.mp}/${vitals.maxMp}`;
        inspector.stamina.textContent = `${vitals.stamina}/${vitals.maxStamina}`;
      } else {
        inspector.vitals.style.display = 'none';
      }
    } else {
      inspector.name.textContent = 'None';
      inspector.glyph.textContent = '-';
      inspector.avatar.textContent = '?';
      (inspector.avatar as HTMLElement).style.color = '#9ca3af';
      inspector.vitals.style.display = 'none';
    }
    inspector.pos.textContent = `${cursor.x}, ${cursor.y}`;
  };

  const uiState = {
    mode: 'normal' as 'normal' | 'move',
    selectedActorId: null as number | null,
  };
  let isPaused = true;

  let statusTimer: number | null = null;
  const setStatus = (message: string) => {
    if (!inspector.status) return;
    inspector.status.textContent = message;
    inspector.status.style.opacity = '1';
    if (statusTimer !== null) window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      if (inspector.status) inspector.status.style.opacity = '0';
    }, 1500);
  };

  const isBlocked = (x: number, y: number, ignoreId?: number) => {
    for (const actor of currentState.actors.actors) {
      if (actor.id === ignoreId) continue;
      const pos = getPosition(currentState.actors, actor.id);
      if (!pos || pos.x !== x || pos.y !== y) continue;
      const pass = getPassability(currentState.actors, actor.id);
      if (!pass || !pass.allowsPassThrough) return true;
    }
    return false;
  };

  const getAdjacentTargetable = (x: number, y: number): Actor | undefined => {
    for (const actor of currentState.actors.actors) {
      const pos = getPosition(currentState.actors, actor.id);
      if (!pos) continue;
      const dx = Math.abs(pos.x - x);
      const dy = Math.abs(pos.y - y);
      if (dx === 0 && dy === 0) continue;
      if (dx <= 1 && dy <= 1 && isTargetable(currentState.actors, actor.id)) {
        return actor; // Target priority: first match in actor list.
      }
    }
    return undefined;
  };

  const updateActionHints = () => {
    if (!inspector.actionHints) return;
    const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
    if (!actor) {
      inspector.actionHints.style.display = 'none';
      return;
    }
    if (isSelectable(currentState.actors, actor.id)) {
      inspector.actionHints.style.display = 'block';
      const pos = getPosition(currentState.actors, actor.id);
      const hasTarget = pos ? getAdjacentTargetable(pos.x, pos.y) : undefined;
      const moveLabel = uiState.mode === 'move' ? 'Enter: Confirm Move' : 'Enter: Move';
      inspector.actionHints.innerHTML = [
        `<span class="action">${moveLabel}</span>`,
        hasTarget ? '<span class="action">I: Mine</span>' : '<span class="action">I: Mine (adjacent rock)</span>',
        hasTarget ? '<span class="action">O: Fight</span>' : '<span class="action">O: Fight (adjacent target)</span>',
        '<span class="action">Esc: Cancel Move</span>',
      ].join(' ');
      return;
    }
    if (isTargetable(currentState.actors, actor.id)) {
      inspector.actionHints.style.display = 'none';
      return;
    }
    inspector.actionHints.style.display = 'none';
  };

  const updateMoveModeUI = () => {
    canvas.classList.toggle('move-mode', uiState.mode === 'move');
  };

  const loop = new FixedStepLoop(
    { stepMs: 1000 / 10 },
    initialState,
    rngSeed,
    {
      getCommands: () => {
        if (!commandQueue.length) return [];
        const cmds = commandQueue.slice();
        commandQueue.length = 0;
        return cmds;
      },
      onAfterStep: (result) => {
        currentState = result.nextState;
        renderer.applyDiff(
          result.diff,
          (terrainId) => terrainId,
          (actorId) => {
            const rend = getRenderable(currentState.actors, actorId);
            return rend?.glyphId ?? 0;
          }
        );
        refreshActors();
        updateInspector();
        updateActionHints();
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

  const confirmMoveToCursor = () => {
    if (uiState.selectedActorId === null) return;
    if (!inBounds(world, cursor.x, cursor.y)) return;
    if (!isWalkable(world, cursor.x, cursor.y)) return;
    if (isBlocked(cursor.x, cursor.y, uiState.selectedActorId)) {
      setStatus('Blocked: cannot move there.');
      return;
    }
    commandQueue.push({ kind: 'moveTo', actorId: uiState.selectedActorId, x: cursor.x, y: cursor.y });
    uiState.mode = 'normal';
    updateMoveModeUI();
    // loop.stepOnce();
  };

  const refreshActors = () => {
    const visuals = currentState.actors.actors.map((actor) => {
      const pos = getPosition(currentState.actors, actor.id);
      const rend = getRenderable(currentState.actors, actor.id);
      return {
        id: actor.id,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        glyphId: rend?.glyphId ?? 0,
      };
    });
    backend.setActors(visuals);
  };

  const queueMine = (actorId: number) => {
    commandQueue.push({ kind: 'mine', actorId });
    // loop.stepOnce();
  };

  window.addEventListener('keydown', (event) => {
    let handled = true;
    switch (event.key) {
      case 'Escape':
        if (uiState.mode === 'move') {
          uiState.mode = 'normal';
          updateMoveModeUI();
        }
        break;
      case ' ':
        if (event.ctrlKey) {
          if (isPaused) {
            loop.stepOnce();
          } else {
            loop.pause();
            isPaused = true;
          }
        } else {
          if (isPaused) {
            loop.resume();
            isPaused = false;
          } else {
            loop.pause();
            isPaused = true;
          }
        }
        break;
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
      case 'Enter':
      case 'e':
      case 'E':
        if (uiState.mode === 'move') {
          confirmMoveToCursor();
        } else {
          const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
          if (actor && isSelectable(currentState.actors, actor.id)) {
            uiState.selectedActorId = actor.id;
            uiState.mode = 'move';
            updateMoveModeUI();
          }
        }
        break;
      case 'i':
      case 'I': {
        const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
        if (!actor || !isSelectable(currentState.actors, actor.id)) break;
        const pos = getPosition(currentState.actors, actor.id);
        const target = pos ? getAdjacentTargetable(pos.x, pos.y) : undefined;
        if (target) {
          queueMine(actor.id);
        }
        break;
      }
      case 'o':
      case 'O': {
        const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
        if (!actor || !isSelectable(currentState.actors, actor.id)) break;
        const pos = getPosition(currentState.actors, actor.id);
        const target = pos ? getAdjacentTargetable(pos.x, pos.y) : undefined;
        if (target) {
          // Placeholder: fight not implemented yet.
        }
        break;
      }
      case 'j':
      case 'k':
      case 'l':
      case 'J':
      case 'K':
      case 'L':
        handled = false;
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
    updateInspector();
    updateActionHints();
  });

  updateInspector();
  updateActionHints();
  updateMoveModeUI();
  loop.start();
}

document.addEventListener('DOMContentLoaded', bootstrap);
