import { Circle, Container, Graphics, Text } from 'pixi.js';
import { DARK, FONT_FAMILY } from '../../ui/theme';

export const GLOW_COLOR = 0xffe066;
const MISS_TINT = 0xff8fa3;

/** A glowing bug carrying one letter. The game moves it; this only draws it. */
export class Firefly extends Container {
  /** Where it is in the field, 0–1 each way. */
  u = 0;
  v = 0;
  /** Flying direction (a unit vector). */
  dx = 1;
  dy = 0;
  caught = false;
  /** Pulses to point out the next letter after a few wrong catches. */
  hinted = false;
  /** 0 when hidden, 1 at full size; tweened as it appears and leaves. */
  appear = 0;
  /** Sideways wobble after a wrong catch, in radii. */
  shake = 0;
  private phase = Math.random() * Math.PI * 2;
  private glow = new Graphics();
  private body = new Graphics();
  private text: Text;

  constructor(readonly letter: string) {
    super();
    this.text = new Text({ text: letter, style: { fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 'bold', fill: DARK } });
    this.text.anchor.set(0.5);
    this.addChild(this.glow, this.body, this.text);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  draw(radius: number): void {
    const r = radius;
    this.glow
      .clear()
      .circle(0, 0, r * 1.5)
      .fill({ color: GLOW_COLOR, alpha: 0.18 })
      .circle(0, 0, r * 1.22)
      .fill({ color: GLOW_COLOR, alpha: 0.3 });
    this.body
      .clear()
      .ellipse(-r * 0.55, -r * 0.8, r * 0.42, r * 0.26)
      .fill({ color: 0xffffff, alpha: 0.7 })
      .ellipse(r * 0.55, -r * 0.8, r * 0.42, r * 0.26)
      .fill({ color: 0xffffff, alpha: 0.7 })
      .circle(0, 0, r)
      .fill(GLOW_COLOR);
    this.text.style.fontSize = r * 1.15;
    // A little bigger than the body, because it's a moving target for small fingers.
    this.hitArea = new Circle(0, 0, r * 1.25);
  }

  setMissed(missed: boolean): void {
    this.body.tint = missed ? MISS_TINT : 0xffffff;
  }

  /** Flickers the glow and applies the hint pulse; `time` is in ms. */
  animate(time: number): void {
    this.glow.alpha = 0.75 + 0.25 * Math.sin(time / 300 + this.phase);
    const pulse = this.hinted && !this.caught ? 1 + 0.18 * Math.abs(Math.sin(time / 220)) : 1;
    if (!this.caught) this.scale.set(this.appear * pulse);
  }
}
