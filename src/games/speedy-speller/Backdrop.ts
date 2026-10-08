import { Graphics } from 'pixi.js';
import type { SpellerTheme } from './themes';

const RAINBOW = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa, 0xce93d8];
const NEBULAS = [0x8e24aa, 0x1e88e5, 0xce93d8];

interface Speck {
  /** Position as a fraction of the screen. */
  x: number;
  y: number;
  size: number;
  /** Seconds for one cycle of its animation. */
  period: number;
  /** Where in the cycle it starts, 0–1. */
  start: number;
}

/** The moving scenery behind the tiles: pond ripples, drifting clouds under a rainbow, or twinkling stars. */
export class Backdrop extends Graphics {
  private specks: Speck[];

  constructor(private theme: SpellerTheme, random: () => number = Math.random) {
    super();
    const count = { tortoise: 5, cloud: 8, space: 90 }[theme.id];
    this.specks = Array.from({ length: count }, (_, i) => ({
      x: random(),
      y: random(),
      size: { tortoise: 60 + i * 50, cloud: 80 + random() * 120, space: random() < 0.15 ? 1.8 : random() < 0.4 ? 1.2 : 0.7 }[theme.id],
      period: { tortoise: 3 + i * 0.4, cloud: 12 + random() * 16, space: 1 + random() * 3 }[theme.id],
      start: random(),
    }));
  }

  /** Redraws for a `width` × `height` screen at `time` ms. Call it every frame. */
  draw(width: number, height: number, time: number): void {
    this.clear().rect(0, 0, width, height).fill(this.theme.background);
    const cycle = (speck: Speck) => (time / 1000 / speck.period + speck.start) % 1;

    if (this.theme.id === 'tortoise') {
      for (const speck of this.specks) {
        const t = cycle(speck);
        this.circle(speck.x * width, speck.y * height, (speck.size / 2) * (0.3 + 1.7 * t)).stroke({
          color: 0xffffff,
          width: 3,
          alpha: 0.3 * (1 - t),
        });
      }
    } else if (this.theme.id === 'cloud') {
      const arc = Math.min(width, height) * 1.2;
      RAINBOW.forEach((color, i) => {
        const size = arc - i * 18;
        this.circle(width / 2, height - size * 0.15, size / 2).stroke({ color, width: 6 + i, alpha: 0.35 });
      });
      for (const speck of this.specks) {
        const drift = Math.sin(cycle(speck) * Math.PI * 2) * 50;
        this.ellipse(speck.x * width + drift, speck.y * height, speck.size / 2, speck.size / 4).fill({ color: 0xffffff, alpha: 0.3 });
      }
    } else {
      NEBULAS.forEach((color, i) => {
        const speck = this.specks[i];
        for (let ring = 10; ring >= 1; ring--) {
          this.circle(speck.x * width, speck.y * height, 18 * ring).fill({ color, alpha: 0.025 });
        }
      });
      for (const speck of this.specks) {
        const twinkle = 0.6 + 0.4 * Math.sin(cycle(speck) * Math.PI * 2);
        this.circle(speck.x * width, speck.y * height, speck.size).fill({ color: 0xffffff, alpha: twinkle });
      }
    }
  }
}
