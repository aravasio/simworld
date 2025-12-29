// Pixi-backed RenderBackend implementation.
// Purpose: render a simple grid and text-based agents using Pixi without leaking Pixi types outward.
// Interacts with: renderer facade (invokes methods), Pixi library (draws).
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { AgentVisual, RenderBackend, TileChange, TilesetMeta } from './backend';

export class PixiBackend implements RenderBackend {
  private app: Application | null = null;
  private tileLayer: Graphics | null = null;
  private agentLayer: Container | null = null;
  private cellSize = 48; // fixed pixel size per cell
  private gridWidth = 0;
  private gridHeight = 0;
  private agentSprites = new Map<number, Text>();
  private cursor: Graphics | null = null;

  async init(canvas: HTMLCanvasElement, _tileset: TilesetMeta): Promise<void> {
    const deviceScale = window.devicePixelRatio || 1;
    this.app = new Application({
      view: canvas,
      background: '#0b0d10',
      antialias: true,
      resolution: deviceScale,
    });
    this.tileLayer = new Graphics();
    this.agentLayer = new Container();
    this.cursor = new Graphics();
    this.app.stage.addChild(this.tileLayer, this.agentLayer, this.cursor);
  }

  setStaticTiles(width: number, height: number, _tiles: number[]): void {
    if (!this.app || !this.tileLayer) return;
    this.gridWidth = width;
    this.gridHeight = height;
    const pixelWidth = width * this.cellSize;
    const pixelHeight = height * this.cellSize;
    this.app.renderer.resize(pixelWidth, pixelHeight);
    // Keep CSS size equal to the render size so the browser does not scale the canvas.
    const view = this.app.view as HTMLCanvasElement;
    view.style.width = `${pixelWidth}px`;
    view.style.height = `${pixelHeight}px`;

    this.tileLayer.clear();
    this.tileLayer.beginFill(0x0f1319);
    this.tileLayer.drawRect(0, 0, width * this.cellSize, height * this.cellSize);
    this.tileLayer.endFill();

    // Draw grid lines to make cells visible.
    this.tileLayer.lineStyle({ width: 1, color: 0x1f2733, alpha: 1 });
    for (let x = 0; x <= width; x++) {
      const px = x * this.cellSize;
      this.tileLayer.moveTo(px, 0);
      this.tileLayer.lineTo(px, height * this.cellSize);
    }
    for (let y = 0; y <= height; y++) {
      const py = y * this.cellSize;
      this.tileLayer.moveTo(0, py);
      this.tileLayer.lineTo(width * this.cellSize, py);
    }
  }

  applyTileChanges(_changes: TileChange[]): void {
    // Tiles are static colored grid for now; tile changes would redraw tiles if implemented.
  }

  setAgents(agents: AgentVisual[]): void {
    if (!this.agentLayer) return;
    this.agentLayer.removeChildren();
    this.agentSprites.clear();
    agents.forEach((a) => this.addOrUpdateAgent(a));
  }

  applyAgentMoves(moves: Array<{ id: number; x: number; y: number; glyphId?: number }>): void {
    moves.forEach((move) => this.addOrUpdateAgent({ id: move.id, x: move.x, y: move.y, glyphId: move.glyphId ?? 0 }));
  }

  setCursorPosition(x: number, y: number): void {
    if (!this.cursor) return;
    this.cursor.clear();
    this.cursor.lineStyle({ width: 2, color: 0xfacc15, alpha: 1 });
    this.cursor.drawRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
  }

  draw(): void {
    this.app?.render();
  }

  destroy(): void {
    this.app?.destroy(true, { children: true, texture: true, baseTexture: true });
    this.agentSprites.clear();
    this.tileLayer = null;
    this.agentLayer = null;
    this.cursor = null;
    this.app = null;
  }

  private addOrUpdateAgent(agent: AgentVisual) {
    if (!this.agentLayer) return;
    let sprite = this.agentSprites.get(agent.id);
    if (!sprite) {
      sprite = new Text(
        agent.glyphId === 1 ? 'X' : 'Y',
        new TextStyle({
          fill: agent.glyphId === 1 ? '#4ade80' : '#f87171',
          fontFamily: 'monospace',
          fontSize: Math.floor(this.cellSize * 0.6),
          fontWeight: 'bold',
        })
      );

      sprite.anchor.set(0.5);
      this.agentLayer.addChild(sprite);
      this.agentSprites.set(agent.id, sprite);
    }
    sprite.text = agent.glyphId === 1 ? 'X' : 'Y';
    sprite.style = new TextStyle({
      fill: agent.glyphId === 1 ? '#4ade80' : '#f87171',
      fontFamily: 'monospace',
      fontSize: Math.floor(this.cellSize * 0.6),
      fontWeight: 'bold',
    });
    sprite.x = (agent.x + 0.5) * this.cellSize;
    sprite.y = (agent.y + 0.5) * this.cellSize;
  }
}
