import { createWorld, TileFlag, isWalkable, withTile } from '../src/world';
import { test, assertEqual } from './harness';

test('world walkable flag is honored', () => {
  let world = createWorld({ width: 2, height: 2 }, 0, TileFlag.Walkable);
  assertEqual(isWalkable(world, 1, 1), true, 'initial walkable');
  world = withTile(world, 1, 1, { clearFlags: TileFlag.Walkable });
  assertEqual(isWalkable(world, 1, 1), false, 'clearing walkable flag');
});
