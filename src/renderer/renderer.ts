// Renderer facade: consumes sim diffs and drives a backend.
// Purpose: translate sim state/diffs into backend operations without exposing backend details.
// Interacts with: RenderBackend (drawing), sim (diffs), world (initial tiles).

import { RenderBackend, TilesetMeta } from './backend';
import { WorldState } from '../world';
import { SimDiff } from '../sim';

export interface RendererOptions {
  backend: RenderBackend;
  canvas: HTMLCanvasElement;
  tileset: TilesetMeta;
}

export class Renderer {
  private backend: RenderBackend;
  private canvas: HTMLCanvasElement;

  constructor(options: RendererOptions) {
    this.backend = options.backend;
    this.canvas = options.canvas;
    this.init(options.tileset);
  }

  private async init(tileset: TilesetMeta) {
    await this.backend.init(this.canvas, tileset);
  }

  setWorld(world: WorldState, glyphForTerrain: (terrainTypeId: number, flags: number) => number) {
    const { width, height } = world.size;
    const tiles: number[] = new Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const terrainId = world.terrainTypeId[idx];
        const flags = world.flags[idx];
        tiles[idx] = glyphForTerrain(terrainId, flags);
      }
    }
    this.backend.setStaticTiles(width, height, tiles);
  }

  applyDiff(diff: SimDiff, glyphForTerrain: (terrainTypeId: number, flags: number) => number, glyphForAgent: (agentId: number) => number) {
    if (diff.tileChanges.length) {
      const changes = diff.tileChanges.map((c) => ({
        x: c.x,
        y: c.y,
        glyphId: c.terrainTypeId !== undefined && c.flagsOp === undefined ? glyphForTerrain(c.terrainTypeId, c.flagsMask ?? 0) : undefined,
      }));
      this.backend.applyTileChanges(changes);
    }
    if (diff.actorMoves.length) {
      const moves = diff.actorMoves.map((m) => ({
        id: m.actorId,
        x: m.to.x,
        y: m.to.y,
        glyphId: glyphForAgent(m.actorId),
      }));
      this.backend.applyActorMoves(moves);
    }
  }

  draw() {
    this.backend.draw();
  }

  destroy() {
    this.backend.destroy();
  }
}
