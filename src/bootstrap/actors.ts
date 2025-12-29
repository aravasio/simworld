import { createActors, createActor, ActorComponents } from '../actors';

export function createInitialActors(center: { x: number; y: number }, bottomY: number) {
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x - 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 1 }),
    ActorComponents.vitals({
      hitPoints: { hp: 10, maxHp: 10 },
      manaPoints: { mp: 5, maxMp: 5 },
      staminaPoints: { stamina: 8, maxStamina: 8 },
    }),
    ActorComponents.tags(['dwarf']),
    ActorComponents.selectable(true),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]); // Green X to the left
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x + 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 2 }),
    ActorComponents.vitals({
      hitPoints: { hp: 10, maxHp: 10 },
      manaPoints: { mp: 5, maxMp: 5 },
      staminaPoints: { stamina: 8, maxStamina: 8 },
    }),
    ActorComponents.tags(['dwarf']),
    ActorComponents.selectable(true),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]); // Red Y to the right

  let nextActorId = 100;
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: center.x - 1, y: 0 }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable']),
    ActorComponents.targetable(true),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: center.x + 1, y: 0 }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable']),
    ActorComponents.targetable(true),
  ]);

  const rockStackId = nextActorId++;
  const goldStackId = nextActorId++;
  actors = createActor(actors, { id: rockStackId }, [
    ActorComponents.kind('rock-material'),
    ActorComponents.renderable({ glyphId: 4 }),
    ActorComponents.stackable({ count: 4 }),
    ActorComponents.tags(['item']),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);
  actors = createActor(actors, { id: goldStackId }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 18 }),
    ActorComponents.tags(['item']),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('chest'),
    ActorComponents.position({ x: center.x, y: center.y }),
    ActorComponents.renderable({ glyphId: 5 }),
    ActorComponents.hp({ hp: 12, maxHp: 12 }),
    ActorComponents.lock({ isLocked: true }),
    ActorComponents.contents([
      { kind: 'stack', itemId: rockStackId },
      { kind: 'stack', itemId: goldStackId },
    ]),
    ActorComponents.targetable(true),
    ActorComponents.selectable(false),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.position({ x: center.x + 2, y: center.y }),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 12 }),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);

  return { actors, nextActorId };
}
