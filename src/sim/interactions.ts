import {
  getContents,
  getHitPoints,
  getKind,
  getLockState,
  getPosition,
  getRenderable,
  getStackable,
  getTags,
  getVitals,
} from '../actors';
import type { ActorId, ContentsEntry, HitPoints, Vitals } from '../actors';
import type { GameState, Mutation } from './types';

const OPEN_CHEST_GLYPH_ID = 7;

export function findAdjacentChest(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
  let best: { id: ActorId; x: number; y: number; score: number } | null = null;
  for (const actor of state.actors.actors) {
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    const dx = Math.abs(pos.x - x);
    const dy = Math.abs(pos.y - y);
    if (dx === 0 && dy === 0) continue;
    if (dx <= 1 && dy <= 1 && getKind(state.actors, actor.id) === 'chest') {
      const renderable = getRenderable(state.actors, actor.id);
      const isOpen = renderable?.glyphId === 7;
      const contents = getContents(state.actors, actor.id) ?? [];
      const hasContents = contents.length > 0;
      const distanceScore = dx + dy;
      const score = (isOpen ? 10 : 0) + (hasContents ? 0 : 1) + distanceScore;
      if (!best || score < best.score) {
        best = { id: actor.id, x: pos.x, y: pos.y, score };
      }
    }
  }
  return best ? { id: best.id, x: best.x, y: best.y } : null;
}

export function findAdjacentAttackable(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
  for (const actor of state.actors.actors) {
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    const dx = Math.abs(pos.x - x);
    const dy = Math.abs(pos.y - y);
    if (dx === 0 && dy === 0) continue;
    if (dx <= 1 && dy <= 1 && getAttackableHitPoints(state, actor.id)) {
      return { id: actor.id, x: pos.x, y: pos.y };
    }
  }
  return null;
}

export function findAdjacentPickable(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
  for (const actor of state.actors.actors) {
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    const dx = Math.abs(pos.x - x);
    const dy = Math.abs(pos.y - y);
    if (dx <= 1 && dy <= 1) {
      const tags = getTags(state.actors, actor.id);
      const stackable = getStackable(state.actors, actor.id);
      if (stackable || tags?.has('item')) {
        return { id: actor.id, x: pos.x, y: pos.y };
      }
    }
  }
  return null;
}

export function maybeQueueOpen(
  mutations: Mutation[],
  state: GameState,
  actorId: ActorId
): { status: 'ok' | 'error'; reason?: string } {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return { status: 'error', reason: 'missing_position' };
  const chest = findAdjacentChest(state, pos.x, pos.y);
  if (!chest) return { status: 'error', reason: 'no_target' };
  const lock = getLockState(state.actors, chest.id);
  if (lock?.isLocked) return { status: 'error', reason: 'locked' };
  const contents = getContents(state.actors, chest.id) ?? [];
  queueContentsDrop(mutations, contents, { x: chest.x, y: chest.y });
  mutations.push({ kind: 'actorContentsSet', actorId: chest.id, contents: [] });
  mutations.push({ kind: 'actorRenderableSet', actorId: chest.id, renderable: { glyphId: OPEN_CHEST_GLYPH_ID } });
  return { status: 'ok' };
}

export function maybeQueueAttack(
  mutations: Mutation[],
  state: GameState,
  actorId: ActorId,
  damage: number = 1
): { status: 'ok' | 'error'; reason?: string } {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return { status: 'error', reason: 'missing_position' };
  const target = findAdjacentAttackable(state, pos.x, pos.y);
  if (!target) return { status: 'error', reason: 'no_target' };
  const attackable = getAttackableHitPoints(state, target.id);
  if (!attackable) return { status: 'error', reason: 'not_attackable' };
  const nextHp = Math.max(0, attackable.hitPoints.hp - damage);
  if (attackable.source === 'hp') {
    const nextHitPoints: HitPoints = { ...attackable.hitPoints, hp: nextHp };
    mutations.push({ kind: 'actorHitPointsSet', actorId: target.id, hitPoints: nextHitPoints });
  } else {
    const nextVitals: Vitals = { ...attackable.vitals, hitPoints: { ...attackable.hitPoints, hp: nextHp } };
    mutations.push({ kind: 'actorVitalsSet', actorId: target.id, vitals: nextVitals });
  }
  if (nextHp === 0) {
    const kind = getKind(state.actors, target.id);
    if (kind === 'chest') {
      const contents = getContents(state.actors, target.id) ?? [];
      queueContentsDrop(mutations, contents, { x: target.x, y: target.y });
    }
    mutations.push({ kind: 'actorRemoved', actorId: target.id });
  }
  return { status: 'ok' };
}

export function maybeQueuePickup(
  mutations: Mutation[],
  state: GameState,
  actorId: ActorId
): { status: 'ok' | 'error'; reason?: string } {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return { status: 'error', reason: 'missing_position' };
  const target = findAdjacentPickable(state, pos.x, pos.y);
  if (!target) return { status: 'error', reason: 'no_target' };
  const contents = getContents(state.actors, actorId) ?? [];
  const isStackable = !!getStackable(state.actors, target.id);
  const entry: ContentsEntry = { kind: isStackable ? 'stack' : 'single', itemId: target.id };
  mutations.push({ kind: 'actorContentsSet', actorId, contents: contents.concat(entry) });
  mutations.push({ kind: 'actorPositionCleared', actorId: target.id });
  return { status: 'ok' };
}

function queueContentsDrop(mutations: Mutation[], contents: ContentsEntry[], position: { x: number; y: number }) {
  for (const entry of contents) {
    mutations.push({ kind: 'actorPositionSet', actorId: entry.itemId, position });
  }
}

function getAttackableHitPoints(
  state: GameState,
  actorId: ActorId
): { source: 'hp'; hitPoints: HitPoints } | { source: 'vitals'; hitPoints: HitPoints; vitals: Vitals } | null {
  const hitPoints = getHitPoints(state.actors, actorId);
  if (hitPoints) return { source: 'hp', hitPoints };
  const vitals = getVitals(state.actors, actorId);
  if (vitals) return { source: 'vitals', hitPoints: vitals.hitPoints, vitals };
  return null;
}
