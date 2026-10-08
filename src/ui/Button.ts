import { Container, Graphics, Text } from 'pixi.js';
import { FONT_FAMILY } from './theme';

export interface ButtonOptions {
  label: string;
  width: number;
  height: number;
  color: number;
  textColor?: number;
  fontSize?: number;
  onClick: () => void;
}

/** A big, friendly rounded button with a simple press animation. */
export class Button extends Container {
  private bg = new Graphics();
  private text: Text;

  constructor(private opts: ButtonOptions) {
    super();
    this.text = new Text({
      text: opts.label,
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: opts.fontSize ?? 28,
        fontWeight: 'bold',
        fill: opts.textColor ?? 0xffffff,
        align: 'center',
      },
    });
    this.text.anchor.set(0.5);
    this.addChild(this.bg, this.text);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerover', () => this.scale.set(1.05));
    this.on('pointerout', () => this.scale.set(1));
    this.on('pointerdown', () => this.scale.set(0.95));
    this.on('pointerup', () => this.scale.set(1.05));
    this.on('pointertap', () => opts.onClick());

    this.setSize(opts.width, opts.height);
  }

  /** Resize the button; its origin stays at the center. */
  setSize(width: number, height: number): void {
    const r = Math.min(24, height / 3);
    this.bg
      .clear()
      .roundRect(-width / 2, -height / 2 + 6, width, height, r)
      .fill({ color: 0x000000, alpha: 0.2 })
      .roundRect(-width / 2, -height / 2, width, height, r)
      .fill(this.opts.color);
    // Shrink the label to fit rather than wrapping it; use "\n" in the label for multi-line buttons.
    this.text.scale.set(1);
    const padX = Math.min(24, width * 0.3);
    const padY = Math.min(12, height * 0.15);
    this.text.scale.set(Math.min(1, (width - padX) / this.text.width, (height - padY) / this.text.height));
  }
}
