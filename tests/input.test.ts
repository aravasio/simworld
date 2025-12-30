import { interpretKeyInput } from '../src/input';
import { test, assertEqual } from './harness';

test('input mapping handles pause, step, and cursor movement', () => {
  const pausedCtx = {
    mode: 'normal',
    isPaused: true,
    hasSelectableAtCursor: false,
    canMine: false,
    canOpen: false,
    canAttack: false,
    canPickup: false,
  };
  const runningCtx = {
    mode: 'normal',
    isPaused: false,
    hasSelectableAtCursor: false,
    canMine: false,
    canOpen: false,
    canAttack: false,
    canPickup: false,
  };

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

test('input mapping handles move mode and action gating', () => {
  const selectableCtx = {
    mode: 'normal',
    isPaused: false,
    hasSelectableAtCursor: true,
    canMine: false,
    canOpen: false,
    canAttack: false,
    canPickup: false,
  };
  const moveCtx = { ...selectableCtx, mode: 'move' as const };
  const canMineCtx = { ...selectableCtx, canMine: true };
  const noMineCtx = { ...selectableCtx, canMine: false };
  const canOpenCtx = { ...selectableCtx, canOpen: true };
  const canAttackCtx = { ...selectableCtx, canAttack: true };
  const canPickupCtx = { ...selectableCtx, canPickup: true };

  assertEqual(interpretKeyInput({ key: 'Enter' }, selectableCtx).kind, 'enterMoveMode', 'enter should start move');
  assertEqual(interpretKeyInput({ key: 'Enter' }, moveCtx).kind, 'confirmMove', 'enter should confirm move');
  assertEqual(interpretKeyInput({ key: 'Escape' }, moveCtx).kind, 'cancelMove', 'escape cancels move');
  assertEqual(interpretKeyInput({ key: 'i' }, canMineCtx).kind, 'queueMine', 'mine when target exists');
  assertEqual(interpretKeyInput({ key: 'i' }, noMineCtx).kind, 'none', 'mine gated when no target');
  assertEqual(interpretKeyInput({ key: 'o' }, canOpenCtx).kind, 'queueOpen', 'open when chest exists');
  assertEqual(interpretKeyInput({ key: 'f' }, canAttackCtx).kind, 'queueAttack', 'attack when target exists');
  assertEqual(interpretKeyInput({ key: 'g' }, canPickupCtx).kind, 'queuePickup', 'pickup when item exists');
});
