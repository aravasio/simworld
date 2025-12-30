import type { Actor } from '../actors';
import type { Renderable, Vitals } from '../actors';

export interface InspectorElements {
  name: HTMLElement | null;
  glyph: HTMLElement | null;
  avatar: HTMLElement | null;
  pos: HTMLElement | null;
  hp: HTMLElement | null;
  mp: HTMLElement | null;
  stamina: HTMLElement | null;
  vitals: HTMLElement | null;
  actionHints: HTMLElement | null;
  status: HTMLElement | null;
}

export interface InspectorContext {
  actor: Actor | undefined;
  cursor: { x: number; y: number };
  kind?: string;
  tags?: Set<string>;
  renderable?: Renderable;
  vitals?: Vitals;
  glyphChar: (glyphId: number) => string;
  glyphColor: (glyphId: number) => string;
}

export interface ActionHintsContext {
  hasSelectable: boolean;
  canMine: boolean;
  canOpen: boolean;
  canAttack: boolean;
  mode: 'normal' | 'move';
}
