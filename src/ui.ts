// Minimal debug UI wiring: pause/resume/step/speed, tick display.
// Purpose: provide simple DOM controls to drive the loop and observe tick count.
// Interacts with: loop (controls), sim state (tick display).

import { FixedStepLoop } from './loop';
import { GameState } from './sim';

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

  const updateTick = () => {
    if (tickLabel) tickLabel.textContent = `Tick: ${opts.getState().tick}`;
    requestAnimationFrame(updateTick);
  };
  requestAnimationFrame(updateTick);
}
