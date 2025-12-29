import type { GameState } from '../sim';

export function startTickUpdater(getState: () => GameState, tickLabel: HTMLElement | null) {
  const updateTick = () => {
    if (tickLabel) tickLabel.textContent = `Tick: ${getState().tick}`;
    requestAnimationFrame(updateTick);
  };
  requestAnimationFrame(updateTick);
}
