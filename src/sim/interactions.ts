import { getContents, getHitPoints, getKind, getLockState, getPosition, isTargetable } from '../actors';
import type { ActorId, ContentsEntry, HitPoints } from '../actors';
import type { GameState, Mutation } from './types';

const OPEN_CHEST_GLYPH_ID = 7;

export function findAdjacentChest(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
  for (const actor of state.actors.actors) {
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    const dx = Math.abs(pos.x - x);
    const dy = Math.abs(pos.y - y);
    if (dx === 0 && dy === 0) continue;
    if (dx <= 1 && dy <= 1 && getKind(state.actors, actor.id) === 'chest') {
      return { id: actor.id, x: pos.x, y: pos.y };
    }
  }
  return null;
}

export function findAdjacentAttackable(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
  for (const actor of state.actors.actors) {
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    const dx = Math.abs(pos.x - x);
    const dy = Math.abs(pos.y - y);
    if (dx === 0 && dy === 0) continue;
    if (dx <= 1 && dy <= 1 && isTargetable(state.actors, actor.id) && getHitPoints(state.actors, actor.id)) {
      return { id: actor.id, x: pos.x, y: pos.y };
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
  const hitPoints = getHitPoints(state.actors, target.id);
  if (!hitPoints) return { status: 'error', reason: 'not_attackable' };
  const nextHp = Math.max(0, hitPoints.hp - damage);
  const nextHitPoints: HitPoints = { ...hitPoints, hp: nextHp };
  mutations.push({ kind: 'actorHitPointsSet', actorId: target.id, hitPoints: nextHitPoints });
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

function queueContentsDrop(mutations: Mutation[], contents: ContentsEntry[], position: { x: number; y: number }) {
  for (const entry of contents) {
    mutations.push({ kind: 'actorPositionSet', actorId: entry.itemId, position });
  }
}
