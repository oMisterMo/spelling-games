import { Container, Graphics, Point, Text } from 'pixi.js';
import { FONT_FAMILY } from '../../ui/theme';
import type { SpellerTheme, TileLook } from './themes';

/** Cloud puffs as [x, y, radius], in units of the tile's radius. */
const CLOUD_PUFFS = [
  [0.1, -0.34, 0.66],
  [0.04, 0.13, 0.75],
  [-0.56, 0.05, 0.44],
  [-0.46, -0.39, 0.36],
  [0.6, 0.02, 0.4],
];
/** Corners in the meteor's outline; their distance from the center wobbles so it looks like a lumpy rock. */
const METEOR_CORNERS = 28;
const METEOR_CRATERS = [
  [-0.42, -0.38, 0.2],
  [0.48, -0.1, 0.15],
  [0.1, 0.55, 0.17],
  [-0.5, 0.3, 0.1],
];

/** A round letter tile, centered on its origin and drawn to suit the theme. */
export class SpellerTile extends Container {
  /** Already part of the word being spelled. */
  picked = false;
  /** Part of a finished word; it can't be picked again. */
  used = false;
  /** Where the tile rests; it's moved around this spot by animations. */
  readonly home = new Point();
  /** Keeps floating tiles out of step with each other. */
  readonly floatOffset = Math.random() * Math.PI * 2;
  private art = new Graphics();
  private text: Text;
  private radius = 0;
  private currentLook: TileLook = 'idle';

  constructor(readonly letter: string, private theme: SpellerTheme) {
    super();
    this.text = new Text({
      text: letter,
      style: { fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 'bold', fill: theme.looks.idle.text },
    });
    this.text.anchor.set(0.5);
    this.addChild(this.art, this.text);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  get look(): TileLook {
    return this.currentLook;
  }

  /** Not `setSize`, which Pixi's Container already has with a different signature. */
  resizeTile(diameter: number): void {
    this.radius = diameter / 2;
    this.text.style.fontSize = Math.max(14, Math.round(diameter * 0.5));
    this.redraw();
  }

  setLook(look: TileLook): void {
    this.currentLook = look;
    this.text.style.fill = this.theme.looks[look].text;
    this.redraw();
  }

  private redraw(): void {
    const r = this.radius;
    const { fill, rim } = this.theme.looks[this.currentLook];
    const g = this.art.clear();
    const line = Math.max(2, r * 0.09);

    if (this.theme.id === 'tortoise') {
      const skin = this.currentLook === 'idle' ? 0x9ccc65 : rim;
      g.circle(0, -r * 0.74, r * 0.26).fill(skin);
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.circle(x * r * 0.62, y * r * 0.5, r * 0.22).fill(skin);
      }
      g.circle(0, r * 0.06, r * 0.74).fill(fill).stroke({ color: rim, width: line });
      this.text.position.set(0, r * 0.06);
    } else if (this.theme.id === 'cloud') {
      for (const [x, y, size] of CLOUD_PUFFS) g.circle(x * r, y * r + r * 0.08, size * r * 0.92).fill({ color: 0x1565c0, alpha: 0.12 });
      for (const [x, y, size] of CLOUD_PUFFS) g.circle(x * r, y * r, size * r * 0.92).fill(fill);
      this.text.position.set(0, 0);
    } else {
      const points: number[] = [];
      for (let i = 0; i < METEOR_CORNERS; i++) {
        const angle = (i / METEOR_CORNERS) * Math.PI * 2;
        const reach = r * (0.9 + 0.05 * Math.sin(angle * 3 + 1) + 0.03 * Math.sin(angle * 5));
        points.push(Math.cos(angle) * reach, Math.sin(angle) * reach);
      }
      g.poly(points).fill(fill).stroke({ color: rim, width: line });
      for (const [x, y, size] of METEOR_CRATERS) g.circle(x * r, y * r, size * r).fill({ color: 0x000000, alpha: 0.2 });
      this.text.position.set(0, 0);
    }
  }
}
