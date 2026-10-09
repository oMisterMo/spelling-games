import { Container, Graphics } from 'pixi.js';
import type { Tween, Tweens } from '../../core/Tweens';
import { DARK } from '../../ui/theme';

const BODY_COLOR = 0x9b5de5;
const FEET_COLOR = 0x7b3fd1;
const HORN_COLOR = 0xffd166;
const TONGUE_COLOR = 0xef476f;

/**
 * The monster that gets fed. Its mouth opens wide for food, chews, and pulls a
 * face at a wrong spelling. Drawn in "units" (the body's radius) picked in `layout`.
 */
export class Monster extends Container {
  /** Everything, so the idle bob and the shake don't fight with `layout`. */
  private inner = new Container();
  private body = new Graphics();
  private eyes = new Graphics();
  private mouth = new Graphics();
  private unit = 60;
  private time = 0;
  /** 0 is a closed smile, 1 is wide open. */
  private open = 0;
  private yucky = false;
  private yuckTimer?: Tween;
  private shake = 0;
  private squash = 0;
  private blinkIn = 2000;
  private blinkLeft = 0;

  constructor() {
    super();
    this.inner.addChild(this.body, this.eyes, this.mouth);
    this.addChild(this.inner);
  }

  /** Where food should fly to, in the parent's coordinates. */
  get mouthPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y + 0.32 * this.unit };
  }

  layout(x: number, y: number, w: number, h: number): void {
    // Horns to feet is about 2.4 units tall and the body is 2 wide.
    const u = Math.max(16, Math.min(120, w / 2.1, h / 2.45));
    this.unit = u;
    this.position.set(x + w / 2, y + h / 2 + 0.08 * u);

    this.body
      .clear()
      .poly([-0.7 * u, -0.6 * u, -0.85 * u, -1.25 * u, -0.35 * u, -0.85 * u])
      .fill(HORN_COLOR)
      .poly([0.7 * u, -0.6 * u, 0.85 * u, -1.25 * u, 0.35 * u, -0.85 * u])
      .fill(HORN_COLOR)
      .ellipse(-0.45 * u, 0.95 * u, 0.3 * u, 0.14 * u)
      .fill(FEET_COLOR)
      .ellipse(0.45 * u, 0.95 * u, 0.3 * u, 0.14 * u)
      .fill(FEET_COLOR)
      .ellipse(0, 0, u, 0.95 * u)
      .fill(BODY_COLOR);

    this.eyes.position.set(0, -0.38 * u);
    this.eyes.clear();
    for (const side of [-1, 1]) {
      this.eyes
        .circle(side * 0.36 * u, 0, 0.25 * u)
        .fill(0xffffff)
        .circle(side * 0.36 * u, 0.04 * u, 0.12 * u)
        .fill(DARK)
        .circle(side * 0.36 * u + 0.04 * u, 0, 0.04 * u)
        .fill(0xffffff);
    }

    this.mouth.position.set(0, 0.32 * u);
    this.drawMouth();
  }

  /** Call every frame for the bobbing and blinking. */
  update(deltaMS: number): void {
    this.time += deltaMS;
    this.blinkLeft -= deltaMS;
    this.blinkIn -= deltaMS;
    if (this.blinkIn <= 0) {
      this.blinkIn = 2000 + Math.random() * 2500;
      this.blinkLeft = 140;
    }
    this.eyes.scale.y = this.yucky ? 0.45 : this.blinkLeft > 0 ? 0.1 : 1;
    this.inner.position.set(this.shake * this.unit, Math.sin(this.time / 600) * 0.03 * this.unit);
    this.inner.scale.set(1 + this.squash, 1 - this.squash);
  }

  /** Opens wide, ready for food. */
  openWide(tweens: Tweens): void {
    tweens.cancel(this.yuckTimer);
    this.yucky = false;
    tweens.add(200, (t) => this.setOpen(t));
  }

  /** Chomps a few times, then closes. */
  chew(tweens: Tweens): void {
    tweens.add(
      1000,
      (t) => {
        this.setOpen((1 - t) * (0.5 + 0.5 * Math.cos(t * Math.PI * 8)));
        this.squash = 0.05 * Math.sin(t * Math.PI * 8) * (1 - t);
      },
      () => this.setOpen(0),
    );
  }

  /** Pulls a face and shudders at a wrong spelling. */
  yuck(tweens: Tweens): void {
    tweens.cancel(this.yuckTimer);
    this.yucky = true;
    this.drawMouth();
    tweens.add(500, (t) => (this.shake = Math.sin(t * Math.PI * 6) * 0.08 * (1 - t)));
    this.yuckTimer = tweens.delay(900, () => {
      this.yucky = false;
      this.drawMouth();
    });
  }

  private setOpen(open: number): void {
    this.open = open;
    this.drawMouth();
  }

  private drawMouth(): void {
    const u = this.unit;
    this.mouth.clear();
    if (this.yucky) {
      // A flat mouth with the tongue hanging out.
      this.mouth
        .roundRect(-0.38 * u, -0.05 * u, 0.76 * u, 0.1 * u, 0.05 * u)
        .fill(DARK)
        .roundRect(0.02 * u, 0, 0.26 * u, 0.32 * u, 0.12 * u)
        .fill(TONGUE_COLOR);
      return;
    }
    const rx = (0.5 - 0.05 * this.open) * u;
    const ry = (0.1 + 0.42 * this.open) * u;
    this.mouth.ellipse(0, 0, rx, ry).fill(DARK);
    if (this.open > 0.25) this.mouth.ellipse(0, ry * 0.55, rx * 0.55, ry * 0.4).fill(TONGUE_COLOR);
    const toothH = Math.min(0.16 * u, ry * 0.7);
    for (const toothX of [-0.22, 0.06]) this.mouth.roundRect(toothX * u, -ry * 0.95, 0.16 * u, toothH, 0.03 * u).fill(0xffffff);
  }
}
