import { createWorld, TileFlag, withTile } from '../src/world';
import { getPosition } from '../src/actors';
import type { GameState } from '../src/sim';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

export function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

export function run() {
  let passed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed += 1;
      console.log(`✓ ${t.name}`);
    } catch (err) {
      console.error(`✗ ${t.name}`);
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
  if (process.exitCode) {
    console.error(`Failed ${tests.length - passed} of ${tests.length} tests.`);
  } else {
    console.log(`All ${passed} tests passed.`);
  }
}

export function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message}: expected ${String(expected)} got ${String(actual)}`);
}

export function assertPosition(actual: { x: number; y: number } | undefined, x: number, y: number, message: string) {
  assert(!!actual, `${message}: missing position`);
  assert(actual?.x === x && actual?.y === y, `${message}: expected (${x},${y}) got (${actual?.x},${actual?.y})`);
}

export function buildWorld(width: number, height: number) {
  return createWorld({ width, height }, 0, TileFlag.Walkable);
}

export function setUnwalkable(world: ReturnType<typeof buildWorld>, x: number, y: number) {
  return withTile(world, x, y, { clearFlags: TileFlag.Walkable });
}

export function snapshotPositions(state: GameState) {
  return state.actors.actors
    .map((actor) => {
      const pos = getPosition(state.actors, actor.id);
      return { id: actor.id, x: pos?.x ?? null, y: pos?.y ?? null };
    })
    .sort((a, b) => a.id - b.id);
}

export function hasActor(state: GameState, id: number) {
  return state.actors.actors.some((actor) => actor.id === id);
}
