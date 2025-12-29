// Fixed-step loop with pause/speed/stepOnce.
// Purpose: orchestrate time progression deterministically using a fixed accumulator loop.
// Interacts with: sim (calls step), renderer (render hook), UI (controls pause/step/speed).

import { Command, StepResult, step, GameState } from './sim';
import { RngSeed } from './rng';

export interface LoopConfig {
  stepMs: number;
  maxSubSteps?: number;
}

export interface LoopDependencies {
  getCommands: () => Command[];
  stepFn?: typeof step;
  onAfterStep?: (result: StepResult) => void;
  onRender?: () => void;
}

export class FixedStepLoop {
  private config: LoopConfig;
  private deps: LoopDependencies;
  private state: GameState;
  private seed: RngSeed;
  private speed = 1;
  private paused = false;
  private lastTime = 0;
  private accum = 0;
  private frameHandle: number | null = null;

  constructor(config: LoopConfig, initialState: GameState, initialSeed: RngSeed, deps: LoopDependencies) {
    this.config = config;
    this.state = initialState;
    this.seed = initialSeed;
    this.deps = deps;
  }

  start() {
    this.lastTime = performance.now();
    const tick = (time: number) => {
      this.frameHandle = requestAnimationFrame(tick);
      if (this.paused) {
        this.lastTime = time;
        return;
      }
      const dt = time - this.lastTime;
      this.lastTime = time;
      this.accum += dt * this.speed;
      const stepMs = this.config.stepMs;
      const maxSubSteps = this.config.maxSubSteps ?? 8;
      let iterations = 0;
      while (this.accum >= stepMs && iterations < maxSubSteps) {
        this.singleStep();
        this.accum -= stepMs;
        iterations++;
      }
      this.deps.onRender?.();
    };
    this.frameHandle = requestAnimationFrame(tick);
  }

  private singleStep() {
    const commands = this.deps.getCommands();
    const stepFn = this.deps.stepFn ?? step;
    const result = stepFn(this.state, commands, this.seed);
    this.state = result.nextState;
    this.seed = result.nextSeed;
    this.deps.onAfterStep?.(result);
  }

  getState(): GameState {
    return this.state;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setSpeed(mult: number) {
    this.speed = mult;
  }

  stepOnce() {
    this.singleStep();
    this.deps.onRender?.();
  }

  stop() {
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }
}
