import { Text } from 'pixi.js';
import { Scene } from '../core/Scene';
import type { SceneManager } from '../core/SceneManager';
import { GAMES } from '../games/registry';
import { Button } from '../ui/Button';
import { FONT_FAMILY } from '../ui/theme';

export class MenuScene extends Scene {
  private title: Text;
  private buttons: Button[];

  constructor(scenes: SceneManager) {
    super();
    this.title = new Text({
      text: 'Spelling Games',
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: 64,
        fontWeight: 'bold',
        fill: 0xffffff,
        dropShadow: { color: 0x000000, alpha: 0.4, distance: 5, blur: 0, angle: Math.PI / 2 },
      },
    });
    this.title.anchor.set(0.5);
    this.addChild(this.title);

    this.buttons = GAMES.map((game) => {
      const button = new Button({
        label: game.title,
        width: 240,
        height: 140,
        color: game.color,
        textColor: game.textColor,
        fontSize: 30,
        onClick: () => scenes.goTo(game.create(scenes, game)),
      });
      this.addChild(button);
      return button;
    });
  }

  resize(width: number, height: number): void {
    const margin = 24;
    const gap = 24;

    this.title.scale.set(1);
    this.title.scale.set(Math.min(1, (width - margin * 2) / this.title.width));
    this.title.position.set(width / 2, margin + this.title.height / 2);
    const top = this.title.y + this.title.height / 2 + gap;

    // Pick a column count that fits the width, then size cards to fill the space.
    const availH = height - top - margin;
    const minCardH = 60;
    let cols = width >= 900 ? 3 : width >= 560 ? 2 : 1;
    let rows = Math.ceil(this.buttons.length / cols);
    // On a phone, go to two columns once a single column would run off the bottom.
    if (cols === 1 && rows * minCardH + gap * (rows - 1) > availH) {
      cols = 2;
      rows = Math.ceil(this.buttons.length / cols);
    }
    const cardW = Math.min(320, (width - margin * 2 - gap * (cols - 1)) / cols);
    const cardH = Math.max(minCardH, Math.min(180, (availH - gap * (rows - 1)) / rows));

    const gridW = cols * cardW + (cols - 1) * gap;
    const startX = (width - gridW) / 2;

    this.buttons.forEach((button, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      button.setSize(cardW, cardH);
      button.position.set(
        startX + col * (cardW + gap) + cardW / 2,
        top + row * (cardH + gap) + cardH / 2,
      );
    });
  }
}
