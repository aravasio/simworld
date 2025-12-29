// Pathfinding abstraction and a simple BFS implementation.
// Purpose: allow swapping algorithms without touching sim logic.

export interface PathNode {
  x: number;
  y: number;
}

export interface GridQuery {
  inBounds: (x: number, y: number) => boolean;
  isWalkable: (x: number, y: number) => boolean;
  // Optional hook for dynamic blockers (actors, doors, etc).
  isBlocked?: (x: number, y: number) => boolean;
}

export type PathfindingFn = (start: PathNode, goal: PathNode, grid: GridQuery) => PathNode[] | null;

export const Pathfinding = {
  // BFS (Breadth-First Search)
  // Why: guarantees shortest path on uniform-cost grids; simple and deterministic.
  // Pros: easy to reason about, no heuristics to tune, works well on small maps.
  // Cons: explores broadly; can be slower/more memory-heavy on large maps than A*.
  bfs: (start: PathNode, goal: PathNode, grid: GridQuery): PathNode[] | null => {
    if (start.x === goal.x && start.y === goal.y) return [];
    const key = (x: number, y: number) => `${x},${y}`;
    const queue: PathNode[] = [start];
    const cameFrom = new Map<string, PathNode | null>();
    cameFrom.set(key(start.x, start.y), null);

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (queue.length) {
      const current = queue.shift()!;
      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const k = key(nx, ny);
        if (cameFrom.has(k)) continue;
        if (!grid.inBounds(nx, ny)) continue;
        if (!grid.isWalkable(nx, ny)) continue;
        if (grid.isBlocked && grid.isBlocked(nx, ny)) continue;
        cameFrom.set(k, current);
        if (nx === goal.x && ny === goal.y) {
          const path: PathNode[] = [{ x: nx, y: ny }];
          let cur: PathNode | null = current;
          while (cur) {
            path.push(cur);
            cur = cameFrom.get(key(cur.x, cur.y)) ?? null;
          }
          path.reverse();
          return path;
        }
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  },
} as const;
