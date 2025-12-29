import { interpretKeyInput } from '../src/input';
import { test, assertEqual } from './harness';

test('input mapping handles pause, step, and cursor movement', () => {
  const pausedCtx = { mode: 'normal', isPaused: true, hasSelectableAtCursor: false, canMine: false };
  const runningCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: false, canMine: false };

  assertEqual(interpretKeyInput({ key: ' ', ctrlKey: true }, pausedCtx).kind, 'stepOnce', 'ctrl+space step');
  assertEqual(interpretKeyInput({ key: ' ', ctrlKey: true }, runningCtx).kind, 'togglePause', 'ctrl+space pauses when running');
  assertEqual(interpretKeyInput({ key: ' ' }, pausedCtx).kind, 'togglePause', 'space toggles pause');

  const move = interpretKeyInput({ key: 'ArrowLeft' }, pausedCtx);
  assertEqual(move.kind, 'cursorMove', 'arrow key should move cursor');
  if (move.kind === 'cursorMove') {
    assertEqual(move.dx, -1, 'cursorMove dx');
    assertEqual(move.dy, 0, 'cursorMove dy');
  }
});

test('input mapping handles move mode and mine gating', () => {
  const selectableCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: true, canMine: false };
  const moveCtx = { mode: 'move', isPaused: false, hasSelectableAtCursor: true, canMine: false };
  const canMineCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: true, canMine: true };
  const noMineCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: true, canMine: false };

  assertEqual(interpretKeyInput({ key: 'Enter' }, selectableCtx).kind, 'enterMoveMode', 'enter should start move');
  assertEqual(interpretKeyInput({ key: 'Enter' }, moveCtx).kind, 'confirmMove', 'enter should confirm move');
  assertEqual(interpretKeyInput({ key: 'Escape' }, moveCtx).kind, 'cancelMove', 'escape cancels move');
  assertEqual(interpretKeyInput({ key: 'i' }, canMineCtx).kind, 'queueMine', 'mine when target exists');
  assertEqual(interpretKeyInput({ key: 'i' }, noMineCtx).kind, 'none', 'mine gated when no target');
});
