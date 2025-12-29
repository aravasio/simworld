export interface Position {
  x: number;
  y: number;
}

export interface Renderable {
  glyphId: number;
}

export interface Vitals {
  hitPoints: HitPoints;
  manaPoints: ManaPoints;
  staminaPoints: StaminaPoints;
}

export interface HitPoints {
  hp: number;
  maxHp: number;
}

export interface ManaPoints {
  mp: number;
  maxMp: number;
}

export interface StaminaPoints {
  stamina: number;
  maxStamina: number;
}

export interface LockState {
  isLocked: boolean;
}

export interface Stackable {
  count: number;
}

export type ContentsEntry =
  | { kind: 'stack'; itemId: number }
  | { kind: 'single'; itemId: number };

export type ActorComponent =
  | { kind: 'position'; value: Position }
  | { kind: 'renderable'; value: Renderable }
  | { kind: 'vitals'; value: Vitals }
  | { kind: 'hp'; value: HitPoints }
  | { kind: 'lock'; value: LockState }
  | { kind: 'contents'; value: ContentsEntry[] }
  | { kind: 'stackable'; value: Stackable }
  | { kind: 'tags'; value: Iterable<string> }
  | { kind: 'kind'; value: string }
  | { kind: 'selectable'; value: boolean }
  | { kind: 'targetable'; value: boolean }
  | { kind: 'passability'; value: { allowsPassThrough: boolean } }
  | { kind: 'path'; value: { x: number; y: number }[] };

export const ActorComponents = {
  kind: (value: string): ActorComponent => ({ kind: 'kind', value }),
  position: (value: Position): ActorComponent => ({ kind: 'position', value }),
  renderable: (value: Renderable): ActorComponent => ({ kind: 'renderable', value }),
  vitals: (value: Vitals): ActorComponent => ({ kind: 'vitals', value }),
  hp: (value: HitPoints): ActorComponent => ({ kind: 'hp', value }),
  lock: (value: LockState): ActorComponent => ({ kind: 'lock', value }),
  contents: (value: ContentsEntry[]): ActorComponent => ({ kind: 'contents', value }),
  stackable: (value: Stackable): ActorComponent => ({ kind: 'stackable', value }),
  tags: (value: Iterable<string>): ActorComponent => ({ kind: 'tags', value }),
  selectable: (value: boolean = true): ActorComponent => ({ kind: 'selectable', value }),
  targetable: (value: boolean = true): ActorComponent => ({ kind: 'targetable', value }),
  passability: (value: { allowsPassThrough: boolean }): ActorComponent => ({ kind: 'passability', value }),
  path: (value: { x: number; y: number }[]): ActorComponent => ({ kind: 'path', value }),
} as const;
