export type InputMode = 'normal' | 'move';

export interface InputContext {
  mode: InputMode;
  isPaused: boolean;
  hasSelectableAtCursor: boolean;
  canMine: boolean;
}

export interface KeyInput {
  key: string;
  ctrlKey?: boolean;
}

export type InputIntent =
  | { kind: 'cursorMove'; dx: number; dy: number }
  | { kind: 'togglePause' }
  | { kind: 'stepOnce' }
  | { kind: 'enterMoveMode' }
  | { kind: 'confirmMove' }
  | { kind: 'cancelMove' }
  | { kind: 'queueMine' }
  | { kind: 'none' };

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
    default:
      return { kind: 'none' };
  }
}
