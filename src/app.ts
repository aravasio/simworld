import { createInitialState } from './bootstrap';
import { createDebugUI } from './ui';
import { FixedStepLoop } from './loop';
import { Renderer } from './renderer/renderer';
import { PixiBackend } from './renderer/pixi';
import { glyphForActor, glyphForTerrain } from './renderer/glyphs';
import { RngSeed } from './rng';
import { createInspector } from './inspector';
import { interpretKeyInput } from './input';
import { GameState, Command, CommandResult, findAdjacentAttackable, findAdjacentChest, findAdjacentMineable } from './sim';
import {
  findActorAt,
  getPosition,
  getRenderable,
  getTags,
  getKind,
  getVitals,
  isSelectable,
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

  renderer.setWorld(world, glyphForTerrain);
  const renderables = Array.from(currentState.actors.actors).flatMap((actor) => {
    const pos = getPosition(currentState.actors, actor.id);
    if (!pos) return [];
    const rend = getRenderable(currentState.actors, actor.id);
    return [
      {
        id: actor.id,
        x: pos.x,
        y: pos.y,
        glyphId: rend?.glyphId ?? 0,
      },
    ];
  });
  backend.setActors(renderables);

  const cursor = { x: cursorStart.x, y: cursorStart.y };
  backend.setCursorPosition(cursor.x, cursor.y);

  const inspector = createInspector(document);

  const actorGlyphChar = (glyphId: number) => glyphForActor(glyphId).char;
  const actorGlyphColor = (glyphId: number) => glyphForActor(glyphId).color;

  const uiState = {
    mode: 'normal' as 'normal' | 'move',
    selectedActorId: null as number | null,
    pendingMoveActorId: null as number | null,
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
    const mineTarget = pos ? findAdjacentMineable(currentState, pos.x, pos.y) : undefined;
    const openTarget = pos ? findAdjacentChest(currentState, pos.x, pos.y) : undefined;
    const attackTarget = pos ? findAdjacentAttackable(currentState, pos.x, pos.y) : undefined;
    inspector.updateActionHints({
      hasSelectable,
      canMine: !!mineTarget,
      canOpen: !!openTarget,
      canAttack: !!attackTarget,
      mode: uiState.mode,
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
          glyphForTerrain,
          (actorId) => {
            const rend = getRenderable(currentState.actors, actorId);
            return rend?.glyphId ?? 0;
          }
        );
        handleCommandResults(result.diff.commandResults);
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
    commandQueue.push({ kind: 'moveTo', actorId: uiState.selectedActorId, x: cursor.x, y: cursor.y });
    uiState.pendingMoveActorId = uiState.selectedActorId;
  };

  const refreshActors = () => {
    const visuals = currentState.actors.actors.flatMap((actor) => {
      const pos = getPosition(currentState.actors, actor.id);
      if (!pos) return [];
      const rend = getRenderable(currentState.actors, actor.id);
      return [
        {
          id: actor.id,
          x: pos.x,
          y: pos.y,
          glyphId: rend?.glyphId ?? 0,
        },
      ];
    });
    backend.setActors(visuals);
  };

  const queueMine = (actorId: number) => {
    commandQueue.push({ kind: 'mine', actorId });
  };

  const queueOpen = (actorId: number) => {
    commandQueue.push({ kind: 'open', actorId });
  };

  const queueAttack = (actorId: number) => {
    commandQueue.push({ kind: 'attack', actorId });
  };

  const handleCommandResults = (results: CommandResult[]) => {
    for (const result of results) {
      if (result.status !== 'error') {
        if (result.kind === 'moveTo' && uiState.pendingMoveActorId === result.actorId) {
          uiState.mode = 'normal';
          uiState.pendingMoveActorId = null;
          updateMoveModeUI();
        }
        continue;
      }
      const reason = result.reason ?? 'unknown';
      let message = 'Action rejected.';
      if (reason === 'out_of_bounds') message = 'Blocked: out of bounds.';
      if (reason === 'not_walkable') message = 'Blocked: terrain not walkable.';
      if (reason === 'blocked') message = 'Blocked: occupied.';
      if (reason === 'no_path') message = 'Blocked: no path.';
      if (result.kind === 'mine' && reason === 'no_target') message = 'Mine: no target adjacent.';
      if (result.kind === 'mine' && reason === 'not_mineable') message = 'Mine: invalid target.';
      if (result.kind === 'open' && reason === 'no_target') message = 'Open: no chest adjacent.';
      if (result.kind === 'open' && reason === 'locked') message = 'Open: chest is locked.';
      if (result.kind === 'attack' && reason === 'no_target') message = 'Smash: no target adjacent.';
      if (result.kind === 'attack' && reason === 'not_attackable') message = 'Smash: target cannot be damaged.';
      inspector.setStatus(message);
      if (result.kind === 'moveTo' && uiState.pendingMoveActorId === result.actorId) {
        uiState.pendingMoveActorId = null;
      }
    }
  };

  window.addEventListener('keydown', (event) => {
    const actorAtCursor = findActorAt(currentState.actors, cursor.x, cursor.y);
    const selectableAtCursor = actorAtCursor ? isSelectable(currentState.actors, actorAtCursor.id) : false;
    const actorPos = actorAtCursor && selectableAtCursor ? getPosition(currentState.actors, actorAtCursor.id) : undefined;
    const mineTarget = actorPos ? findAdjacentMineable(currentState, actorPos.x, actorPos.y) : undefined;
    const openTarget = actorPos ? findAdjacentChest(currentState, actorPos.x, actorPos.y) : undefined;
    const attackTarget = actorPos ? findAdjacentAttackable(currentState, actorPos.x, actorPos.y) : undefined;
    const intent = interpretKeyInput(
      { key: event.key, ctrlKey: event.ctrlKey },
      {
        mode: uiState.mode,
        isPaused,
        hasSelectableAtCursor: selectableAtCursor,
        canMine: !!mineTarget,
        canOpen: !!openTarget,
        canAttack: !!attackTarget,
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
      case 'queueOpen':
        if (actorAtCursor && selectableAtCursor) {
          queueOpen(actorAtCursor.id);
        }
        break;
      case 'queueAttack':
        if (actorAtCursor && selectableAtCursor) {
          queueAttack(actorAtCursor.id);
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
