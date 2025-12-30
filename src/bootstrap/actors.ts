import { createActors, createActor, ActorComponents } from '../actors';

export function createInitialActors(worldSize: { width: number; height: number }, center: { x: number; y: number }, bottomY: number) {
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
  const topY = 0;
  const rightmostX = worldSize.width - 1;
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: rightmostX - 1, y: topY }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable']),
    ActorComponents.targetable(true),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('rock'),
    ActorComponents.position({ x: rightmostX, y: topY }),
    ActorComponents.renderable({ glyphId: 3 }),
    ActorComponents.tags(['mineable']),
    ActorComponents.targetable(true),
  ]);

  const goldStack10Id = nextActorId++;
  const goldStack1Id = nextActorId++;
  actors = createActor(actors, { id: goldStack10Id }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 10 }),
    ActorComponents.tags(['item']),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);
  actors = createActor(actors, { id: goldStack1Id }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 1 }),
    ActorComponents.tags(['item']),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);

  const chestY = topY;
  const chestXs = [0, 1, 2];
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('chest'),
    ActorComponents.position({ x: chestXs[0], y: chestY }),
    ActorComponents.renderable({ glyphId: 5 }),
    ActorComponents.hp({ hp: 6, maxHp: 6 }),
    ActorComponents.lock({ isLocked: false }),
    ActorComponents.contents([{ kind: 'stack', itemId: goldStack10Id }]),
    ActorComponents.targetable(true),
    ActorComponents.selectable(false),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('chest'),
    ActorComponents.position({ x: chestXs[1], y: chestY }),
    ActorComponents.renderable({ glyphId: 5 }),
    ActorComponents.hp({ hp: 6, maxHp: 6 }),
    ActorComponents.lock({ isLocked: false }),
    ActorComponents.contents([{ kind: 'stack', itemId: goldStack1Id }]),
    ActorComponents.targetable(true),
    ActorComponents.selectable(false),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);
  actors = createActor(actors, { id: nextActorId++ }, [
    ActorComponents.kind('chest'),
    ActorComponents.position({ x: chestXs[2], y: chestY }),
    ActorComponents.renderable({ glyphId: 5 }),
    ActorComponents.hp({ hp: 6, maxHp: 6 }),
    ActorComponents.lock({ isLocked: false }),
    ActorComponents.contents([]),
    ActorComponents.targetable(true),
    ActorComponents.selectable(false),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);

  return { actors, nextActorId };
}
