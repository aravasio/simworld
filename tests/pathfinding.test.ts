import { Pathfinding } from '../src/pathfinding';
import { test, assert, assertEqual } from './harness';

test('pathfinding bfs returns shortest path on open grid', () => {
  const path = Pathfinding.bfs(
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 3 && y < 3,
      isWalkable: () => true,
    }
  );
  assert(!!path, 'expected a path');
  assertEqual(path.length, 3, 'shortest path length');
  assertEqual(path[0].x, 0, 'path start x');
  assertEqual(path[0].y, 0, 'path start y');
  assertEqual(path[path.length - 1].x, 2, 'path goal x');
  assertEqual(path[path.length - 1].y, 0, 'path goal y');
});

test('pathfinding bfs respects blockers and unreachable targets', () => {
  const detour = Pathfinding.bfs(
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 3 && y < 3,
      isWalkable: () => true,
      isBlocked: (x, y) => x === 1 && y === 0,
    }
  );
  assert(!!detour, 'expected a detour path');
  assertEqual(detour.length, 5, 'detour path length');

  const unreachable = Pathfinding.bfs(
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 2 && y < 1,
      isWalkable: () => false,
    }
  );
  assert(unreachable === null, 'unreachable target should return null');
});

test('pathfinding bfs returns empty path when start equals goal', () => {
  const path = Pathfinding.bfs(
    { x: 1, y: 1 },
    { x: 1, y: 1 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 3 && y < 3,
      isWalkable: () => true,
    }
  );
  assert(Array.isArray(path) && path.length === 0, 'expected empty path for start==goal');
});
