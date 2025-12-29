// RenderBackend interface: hides drawing tech (Pixi/WebGL/etc.).
// Purpose: define the contract for any rendering backend so renderer logic stays engine-owned.
// Interacts with: renderer facade (drives this), concrete backends (Pixi/WebGL implementations).

export interface TilesetMeta {
  atlasUrl: string;
  glyphs: Record<number, { u0: number; v0: number; u1: number; v1: number }>;
}

export interface TileChange {
  x: number;
  y: number;
  glyphId?: number;
}

export interface AgentVisual {
  id: number;
  x: number;
  y: number;
  glyphId: number;
}

export interface RenderBackend {
  init(canvas: HTMLCanvasElement, tileset: TilesetMeta): Promise<void>;
  setStaticTiles(width: number, height: number, tiles: number[]): void; // glyphId per tile
  applyTileChanges(changes: TileChange[]): void;
  setEntities(entities: AgentVisual[]): void;
  setAgents(agents: AgentVisual[]): void;
  applyAgentMoves(moves: Array<{ id: number; x: number; y: number; glyphId?: number }>): void;
  setCursorPosition(x: number, y: number): void;
  draw(): void;
  destroy(): void;
}
