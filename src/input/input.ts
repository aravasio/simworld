import type { InputContext, InputIntent, KeyInput } from './types';

export function interpretKeyInput(input: KeyInput, context: InputContext): InputIntent {
  switch (input.key) {
    case 'Escape':
      return context.mode === 'move' ? { kind: 'cancelMove' } : { kind: 'none' };
    case ' ':
      if (input.ctrlKey) {
        return context.isPaused ? { kind: 'stepOnce' } : { kind: 'togglePause' };
      }
      return { kind: 'togglePause' };
    case 'ArrowUp':
    case 'w':
    case 'W':
      return { kind: 'cursorMove', dx: 0, dy: -1 };
    case 'ArrowDown':
    case 's':
    case 'S':
      return { kind: 'cursorMove', dx: 0, dy: 1 };
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return { kind: 'cursorMove', dx: -1, dy: 0 };
    case 'ArrowRight':
    case 'd':
    case 'D':
      return { kind: 'cursorMove', dx: 1, dy: 0 };
    case 'Enter':
    case 'e':
    case 'E':
      if (context.mode === 'move') return { kind: 'confirmMove' };
      return context.hasSelectableAtCursor ? { kind: 'enterMoveMode' } : { kind: 'none' };
    case 'i':
    case 'I':
      return context.canMine ? { kind: 'queueMine' } : { kind: 'none' };
    case 'o':
    case 'O':
      return context.canOpen ? { kind: 'queueOpen' } : { kind: 'none' };
    case 'f':
    case 'F':
      return context.canAttack ? { kind: 'queueAttack' } : { kind: 'none' };
    default:
      return { kind: 'none' };
  }
}
