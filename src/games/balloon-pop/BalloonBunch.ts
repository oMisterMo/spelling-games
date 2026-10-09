import { Container, Graphics, Text } from 'pixi.js';
import type { Tweens } from '../../core/Tweens';
import { EMOJI_FONT_FAMILY } from '../../ui/theme';

const COLORS = [0xef476f, 0xffd166, 0x06d6a0, 0x9b5de5, 0xf78c6b, 0xf15bb5, 0xffffff];
const GROUND_COLOR = 0x8ac926;
/** How far the rider falls to the ground, in units (see `layout`). */
const FALL = 0.6;

interface Balloon {
  view: Graphics;
  color: number;
  popped: boolean;
}

/**
 * A rider hanging from a bunch of balloons above a little hill. Each `pop()`
 * bursts one balloon, and when the last one goes the rider drops to the hill.
 * Everything is drawn in "units" (about one balloon wide) picked in `layout`.
 */
export class BalloonBunch extends Container {
  private ground = new Graphics();
  /** The parts that bob up and down: strings, balloons, burst and rider. */
  private floating = new Container();
  private strings = new Graphics();
  private burst = new Graphics();
  private rider: Text;
  private balloons: Balloon[] = [];
  private unit = 40;
  private time = 0;
  /** 0 while flying, 1 once the rider has landed on the hill. */
  private fall = 0;
  /** Extra height (in units) during the hop after a solved word. */
  private lift = 0;

  constructor() {
    super();
    this.rider = new Text({ text: '', style: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 40 } });
    this.rider.anchor.set(0.5);
    this.burst.visible = false;
    this.floating.addChild(this.strings, this.burst, this.rider);
    this.addChild(this.ground, this.floating);
  }

  get remaining(): number {
    return this.balloons.filter((b) => !b.popped).length;
  }

  /** Starts over with `count` balloons. Call `layout()` afterwards. */
  reset(count: number, rider: string): void {
    for (const balloon of this.balloons) balloon.view.destroy();
    this.balloons = Array.from({ length: count }, (_, i) => {
      const view = new Graphics();
      this.floating.addChildAt(view, 1); // Above the strings, below the burst and rider.
      return { view, color: COLORS[i % COLORS.length], popped: false };
    });
    this.rider.text = rider;
    this.fall = 0;
    this.lift = 0;
  }

  layout(x: number, y: number, w: number, h: number): void {
    // The scene is about 5 units wide and 5 tall, from the top balloon to the hill.
    const u = Math.max(12, Math.min(84, w / 5.2, h / 5.1));
    this.unit = u;
    // The origin is where the strings meet, just above the rider.
    this.position.set(x + w / 2, y + (h - 5 * u) / 2 + 3.1 * u);

    const n = this.balloons.length;
    const step = n > 1 ? Math.min(0.38, 1.9 / (n - 1)) : 0;
    this.balloons.forEach((balloon, i) => {
      const angle = (i - (n - 1) / 2) * step;
      const radius = (i % 2 === 0 ? 2.45 : 1.85) * u;
      balloon.view.position.set(Math.sin(angle) * radius, -Math.cos(angle) * radius);
      balloon.view
        .clear()
        .ellipse(0, 0, 0.5 * u, 0.62 * u)
        .fill(balloon.color)
        .poly([-0.09 * u, 0.72 * u, 0.09 * u, 0.72 * u, 0, 0.58 * u])
        .fill(balloon.color)
        .ellipse(-0.18 * u, -0.25 * u, 0.09 * u, 0.16 * u)
        .fill({ color: 0xffffff, alpha: 0.4 });
    });

    this.rider.style.fontSize = u * 0.9;
    this.ground.clear().ellipse(0, (1.15 + FALL) * u, 1.7 * u, 0.25 * u).fill(GROUND_COLOR);
    this.drawStrings();
    this.place();
  }

  /** Call every frame for the gentle bobbing. */
  update(deltaMS: number): void {
    this.time += deltaMS;
    this.place();
  }

  /** Bursts one balloon, working inwards from the outside. Lands the rider when it was the last. */
  pop(tweens: Tweens): void {
    const mid = (this.balloons.length - 1) / 2;
    const left = this.balloons.filter((b) => !b.popped);
    const balloon = left.sort((a, b) => Math.abs(this.balloons.indexOf(b) - mid) - Math.abs(this.balloons.indexOf(a) - mid))[0];
    if (!balloon) return;
    balloon.popped = true;
    this.drawStrings();

    const { view } = balloon;
    const u = this.unit;
    this.burst.clear();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.burst.moveTo(Math.cos(a) * 0.45 * u, Math.sin(a) * 0.45 * u).lineTo(Math.cos(a) * 0.8 * u, Math.sin(a) * 0.8 * u);
    }
    this.burst.stroke({ color: 0xffffff, width: Math.max(2, u * 0.08), cap: 'round' });
    this.burst.position.copyFrom(view.position);
    this.burst.visible = true;
    tweens.add(
      260,
      (t) => {
        view.scale.set(1 + 0.5 * Math.min(1, t * 3));
        view.alpha = Math.max(0, 1 - t * 3);
        this.burst.scale.set(0.6 + 0.7 * t);
        this.burst.alpha = 1 - t;
      },
      () => (this.burst.visible = false),
    );

    if (this.remaining === 0) {
      // Drop like a ball: fall, then one small bounce.
      tweens.add(700, (t) => (this.fall = t < 0.6 ? Math.pow(t / 0.6, 2) : 1 - 0.15 * Math.sin(((t - 0.6) / 0.4) * Math.PI)));
    }
  }

  /** A happy hop for a solved word. */
  celebrate(tweens: Tweens): void {
    tweens.add(900, (t) => (this.lift = 0.45 * Math.abs(Math.sin(t * Math.PI * 2)) * (1 - t * 0.5)), () => (this.lift = 0));
  }

  private drawStrings(): void {
    const u = this.unit;
    this.strings.clear();
    const flying = this.balloons.filter((b) => !b.popped);
    if (flying.length === 0) return;
    for (const { view } of flying) this.strings.moveTo(0, 0).lineTo(view.x, view.y + 0.72 * u);
    this.strings.stroke({ color: 0xffffff, alpha: 0.85, width: Math.max(1.5, u * 0.035) });
  }

  private place(): void {
    const u = this.unit;
    const flying = 1 - Math.min(1, this.fall);
    this.floating.y = (Math.sin(this.time / 650) * 0.07 * flying - this.lift) * u;
    this.floating.rotation = Math.sin(this.time / 1100) * 0.035 * flying;
    this.rider.y = (0.5 + this.fall * FALL) * u;
  }
}
