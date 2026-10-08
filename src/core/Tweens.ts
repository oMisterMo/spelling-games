export interface Tween {
  duration: number;
  elapsed: number;
  onUpdate: (t: number) => void;
  onDone?: () => void;
  cancelled: boolean;
}

/** A minimal tween runner. Call `update()` from the owning scene's `update()`. */
export class Tweens {
  private active: Tween[] = [];

  /** Calls `onUpdate` with t going from 0 to 1 over `duration` ms. */
  add(duration: number, onUpdate: (t: number) => void, onDone?: () => void): Tween {
    const tween: Tween = { duration, elapsed: 0, onUpdate, onDone, cancelled: false };
    this.active.push(tween);
    return tween;
  }

  delay(duration: number, onDone: () => void): Tween {
    return this.add(duration, () => {}, onDone);
  }

  /** Stops a tween where it is, without calling `onDone`. */
  cancel(tween: Tween | undefined): void {
    if (tween) tween.cancelled = true;
  }

  update(deltaMS: number): void {
    for (const tween of [...this.active]) {
      if (!tween.cancelled) {
        tween.elapsed += deltaMS;
        const t = Math.min(1, tween.elapsed / tween.duration);
        tween.onUpdate(t);
        if (t < 1) continue;
      }
      this.active.splice(this.active.indexOf(tween), 1);
      if (!tween.cancelled) tween.onDone?.();
    }
  }
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
