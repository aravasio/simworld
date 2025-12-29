import type { FixedStepLoop } from '../loop';
import type { GameState } from '../sim';
import { startTickUpdater } from './state';

export interface DebugUIOptions {
  loop: FixedStepLoop;
  getState: () => GameState;
}

export function createDebugUI(opts: DebugUIOptions) {
  const speedInput = document.getElementById('speed') as HTMLInputElement | null;
  const tickLabel = document.getElementById('tick');

  speedInput?.addEventListener('change', () => {
    const v = Number(speedInput.value);
    if (!Number.isNaN(v) && v > 0) opts.loop.setSpeed(v / 10);
  });

  startTickUpdater(opts.getState, tickLabel);
}
