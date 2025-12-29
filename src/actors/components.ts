export interface Position {
  x: number;
  y: number;
}

export interface Renderable {
  glyphId: number;
}

export interface Vitals {
  maxHp: number;
  maxMp: number;
  maxStamina: number;
  hp: number;
  mp: number;
  stamina: number;
}

export type ActorComponent =
  | { kind: 'position'; value: Position }
  | { kind: 'renderable'; value: Renderable }
  | { kind: 'vitals'; value: Vitals }
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
  tags: (value: Iterable<string>): ActorComponent => ({ kind: 'tags', value }),
  selectable: (value: boolean = true): ActorComponent => ({ kind: 'selectable', value }),
  targetable: (value: boolean = true): ActorComponent => ({ kind: 'targetable', value }),
  passability: (value: { allowsPassThrough: boolean }): ActorComponent => ({ kind: 'passability', value }),
  path: (value: { x: number; y: number }[]): ActorComponent => ({ kind: 'path', value }),
} as const;
