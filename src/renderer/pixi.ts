// Pixi-backed RenderBackend implementation.
// Purpose: render a simple grid and text-based agents using Pixi without leaking Pixi types outward.
// Interacts with: renderer facade (invokes methods), Pixi library (draws).
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { AgentVisual, RenderBackend, TileChange, TilesetMeta } from './backend';
import { glyphForActor } from './glyphs';

export class PixiBackend implements RenderBackend {
  private app: Application | null = null;
  private tileLayer: Graphics | null = null;
  private agentLayer: Container | null = null;
  private cellSize = 48; // fixed pixel size per cell
  private gridWidth = 0;
  private gridHeight = 0;
  private agentSprites = new Map<number, Container>();
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

  setActors(actors: AgentVisual[]): void {
    if (!this.agentLayer) return;
    this.agentLayer.removeChildren();
    this.agentSprites.clear();
    actors.forEach((a) => this.addOrUpdateActor(a));
  }

  applyActorMoves(moves: Array<{ id: number; x: number; y: number; glyphId?: number; stackCount?: number }>): void {
    moves.forEach((move) =>
      this.addOrUpdateActor({ id: move.id, x: move.x, y: move.y, glyphId: move.glyphId ?? 0, stackCount: move.stackCount })
    );
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

  private addOrUpdateActor(actor: AgentVisual) {
    if (!this.agentLayer) return;
    let sprite = this.agentSprites.get(actor.id);
    if (!sprite) {
      sprite = new Container();
      this.agentLayer.addChild(sprite);
      this.agentSprites.set(actor.id, sprite);
    }
    sprite.removeChildren();

    const { char, color } = glyphForActor(actor.glyphId);
    if (actor.glyphId === 6) {
      const count = Math.max(1, actor.stackCount ?? 1);
      const offsets = getCoinOffsets(count, this.cellSize);
      const style = getCoinStyle(this.cellSize, color);
      for (const offset of offsets) {
        const coin = new Text(char, style);
        coin.anchor.set(0.5);
        coin.x = offset.x;
        coin.y = offset.y;
        sprite.addChild(coin);
      }
    } else {
      const text = new Text(
        char,
        new TextStyle({
          fill: color,
          fontFamily: 'monospace',
          fontSize: Math.floor(this.cellSize * 0.6),
          fontWeight: 'bold',
        })
      );
      text.anchor.set(0.5);
      sprite.addChild(text);
    }

    sprite.x = (actor.x + 0.5) * this.cellSize;
    sprite.y = (actor.y + 0.5) * this.cellSize;
  }
}

function getCoinOffsets(count: number, cellSize: number): Array<{ x: number; y: number }> {
  const spread = cellSize * 0.12;
  if (count <= 1) return [{ x: 0, y: 0 }];
  if (count === 2) {
    return [
      { x: -spread, y: spread * 0.2 },
      { x: spread, y: -spread * 0.2 },
    ];
  }
  return [
    { x: 0, y: -spread },
    { x: -spread, y: spread },
    { x: spread, y: spread },
  ];
}

function getCoinStyle(cellSize: number, color: string): TextStyle {
  return new TextStyle({
    fill: color,
    fontFamily: 'monospace',
    fontSize: Math.floor(cellSize * 0.35),
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#3a2f14',
    dropShadowBlur: 2,
    dropShadowAngle: Math.PI / 4,
    dropShadowDistance: 1,
  });
}
