export type InputMode = 'normal' | 'move';

export interface InputContext {
  mode: InputMode;
  isPaused: boolean;
  hasSelectableAtCursor: boolean;
  canMine: boolean;
  canOpen: boolean;
  canAttack: boolean;
  canPickup: boolean;
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
  | { kind: 'queueOpen' }
  | { kind: 'queueAttack' }
  | { kind: 'queuePickup' }
  | { kind: 'none' };
