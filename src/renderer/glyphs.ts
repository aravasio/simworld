export interface GlyphStyle {
  char: string;
  color: string;
}

export function glyphForTerrain(terrainTypeId: number, _flags: number): number {
  return terrainTypeId;
}

export function glyphForActor(glyphId: number): GlyphStyle {
  switch (glyphId) {
    case 1:
      return { char: 'X', color: '#4ade80' };
    case 2:
      return { char: 'Y', color: '#f87171' };
    case 3:
      return { char: '#', color: '#9ca3af' }; // stone
    case 4:
      return { char: '*', color: '#c58a2d' }; // rock material
    case 5:
      return { char: 'C', color: '#b5895b' }; // chest
    case 6:
      return { char: '.', color: '#f6d365' }; // gold coin
    case 7:
      return { char: 'c', color: '#c8a26a' }; // open chest
    default:
      return { char: '?', color: '#9ba4b0' };
  }
}
