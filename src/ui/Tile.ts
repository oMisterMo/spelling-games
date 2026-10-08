import { Container, Graphics, Text } from 'pixi.js';
import { DARK, FONT_FAMILY } from './theme';

export const TILE_COLOR = 0xffffff;

/**
 * A draggable rounded tile with a label, centered on its origin. Games add
 * their own state (which slot it's in, whether it's locked) in a subclass.
 */
export class Tile extends Container {
  private bg = new Graphics();
  private text: Text;
  private w = 0;
  private h = 0;
  private color = TILE_COLOR;

  constructor(label: string) {
    super();
    this.text = new Text({
      text: label,
      style: { fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 'bold', fill: DARK },
    });
    this.text.anchor.set(0.5);
    this.addChild(this.bg, this.text);
    this.eventMode = 'static';
    this.cursor = 'grab';
  }

  /** Not `setSize`, which Pixi's Container already has with a different signature. */
  resizeTile(w: number, h: number, fontSize: number): void {
    this.w = w;
    this.h = h;
    this.text.style.fontSize = fontSize;
    this.redraw();
  }

  setLabel(label: string): void {
    this.text.text = label;
  }

  /** By default white tiles get dark text and colored tiles get white text; pass `textColor` to override. */
  setColor(color: number, textColor?: number): void {
    this.color = color;
    this.text.style.fill = textColor ?? (color === TILE_COLOR ? DARK : 0xffffff);
    this.redraw();
  }

  private redraw(): void {
    const r = Math.min(18, this.h / 3);
    this.bg
      .clear()
      .roundRect(-this.w / 2, -this.h / 2 + 4, this.w, this.h, r)
      .fill({ color: 0x000000, alpha: 0.2 })
      .roundRect(-this.w / 2, -this.h / 2, this.w, this.h, r)
      .fill(this.color);
  }
}
