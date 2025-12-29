import { createActors, createActor, ActorComponents } from '../actors';

export function createInitialActors(center: { x: number; y: number }, bottomY: number) {
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x - 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 1 }),
    ActorComponents.vitals({ maxHp: 10, maxMp: 5, maxStamina: 8, hp: 10, mp: 5, stamina: 8 }),
    ActorComponents.tags(['dwarf']),
    ActorComponents.selectable(true),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]); // Green X to the left
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: center.x + 1, y: bottomY }),
    ActorComponents.renderable({ glyphId: 2 }),
    ActorComponents.vitals({ maxHp: 10, maxMp: 5, maxStamina: 8, hp: 10, mp: 5, stamina: 8 }),
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

  return { actors, nextActorId };
}
