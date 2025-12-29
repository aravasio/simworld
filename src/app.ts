import { createInitialState } from './bootstrap';
import { createDebugUI } from './ui';
import { FixedStepLoop } from './loop';
import { Renderer } from './renderer/renderer';
import { PixiBackend } from './renderer/pixi';
import { RngSeed } from './rng';
import { createInspector } from './inspector';
import { interpretKeyInput } from './input';
import { GameState, Command, canMoveTo, findAdjacentTargetable } from './sim';
import {
  findActorAt,
  getPosition,
  getRenderable,
  getTags,
  getKind,
  getVitals,
  isSelectable,
  isTargetable,
} from './actors';
import { inBounds } from './world';

export function startApp() {
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas #viewport not found');
  }

  const { world, actors, nextActorId, cursorStart } = createInitialState();
  const initialState: GameState = { world, actors, tick: 0, nextActorId };
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

  const cursor = { x: cursorStart.x, y: cursorStart.y };
  backend.setCursorPosition(cursor.x, cursor.y);

  const inspector = createInspector(document);

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

  const uiState = {
    mode: 'normal' as 'normal' | 'move',
    selectedActorId: null as number | null,
  };
  let isPaused = true;

  const updateInspector = () => {
    const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
    inspector.updateInspector({
      actor,
      cursor,
      kind: actor ? getKind(currentState.actors, actor.id) : undefined,
      tags: actor ? getTags(currentState.actors, actor.id) : undefined,
      renderable: actor ? getRenderable(currentState.actors, actor.id) : undefined,
      vitals: actor ? getVitals(currentState.actors, actor.id) : undefined,
      glyphChar: actorGlyphChar,
      glyphColor: actorGlyphColor,
    });
  };

  const updateActionHints = () => {
    const actor = findActorAt(currentState.actors, cursor.x, cursor.y);
    const hasSelectable = actor ? isSelectable(currentState.actors, actor.id) : false;
    const pos = actor ? getPosition(currentState.actors, actor.id) : undefined;
    const target = pos ? findAdjacentTargetable(currentState, pos.x, pos.y) : undefined;
    inspector.updateActionHints({
      hasSelectable,
      hasTarget: !!target,
      mode: uiState.mode,
      hasTargetable: actor ? isTargetable(currentState.actors, actor.id) : false,
    });
  };

  const updateMoveModeUI = () => {
    canvas.classList.toggle('move-mode', uiState.mode === 'move');
  };

  const loop = new FixedStepLoop(
    { stepMs: 1000 / 10, maxSubSteps: 1 },
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
    if (!canMoveTo(currentState, uiState.selectedActorId, cursor.x, cursor.y)) {
      inspector.setStatus('Blocked: cannot move there.');
      return;
    }
    commandQueue.push({ kind: 'moveTo', actorId: uiState.selectedActorId, x: cursor.x, y: cursor.y });
    uiState.mode = 'normal';
    updateMoveModeUI();
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
  };

  window.addEventListener('keydown', (event) => {
    const actorAtCursor = findActorAt(currentState.actors, cursor.x, cursor.y);
    const selectableAtCursor = actorAtCursor ? isSelectable(currentState.actors, actorAtCursor.id) : false;
    const actorPos = actorAtCursor && selectableAtCursor ? getPosition(currentState.actors, actorAtCursor.id) : undefined;
    const target = actorPos ? findAdjacentTargetable(currentState, actorPos.x, actorPos.y) : undefined;
    const intent = interpretKeyInput(
      { key: event.key, ctrlKey: event.ctrlKey },
      {
        mode: uiState.mode,
        isPaused,
        hasSelectableAtCursor: selectableAtCursor,
        canMine: !!target,
      }
    );

    switch (intent.kind) {
      case 'cancelMove':
        uiState.mode = 'normal';
        updateMoveModeUI();
        break;
      case 'togglePause':
        if (isPaused) {
          loop.resume();
          isPaused = false;
        } else {
          loop.pause();
          isPaused = true;
        }
        break;
      case 'stepOnce':
        if (isPaused) {
          loop.stepOnce();
        } else {
          loop.pause();
          isPaused = true;
        }
        break;
      case 'cursorMove':
        moveCursor(intent.dx, intent.dy);
        break;
      case 'enterMoveMode':
        if (actorAtCursor && selectableAtCursor) {
          uiState.selectedActorId = actorAtCursor.id;
          uiState.mode = 'move';
          updateMoveModeUI();
        }
        break;
      case 'confirmMove':
        confirmMoveToCursor();
        break;
      case 'queueMine':
        if (actorAtCursor && selectableAtCursor) {
          queueMine(actorAtCursor.id);
        }
        break;
      case 'none':
        break;
    }

    if (intent.kind !== 'none') event.preventDefault();
    updateInspector();
    updateActionHints();
  });

  updateInspector();
  updateActionHints();
  updateMoveModeUI();
  loop.start();
}
