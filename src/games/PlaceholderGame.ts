import { Graphics, Text } from 'pixi.js';
import { Scene } from '../core/Scene';
import type { SceneManager } from '../core/SceneManager';
import { MenuScene } from '../scenes/MenuScene';
import { Button } from '../ui/Button';
import { DARK, FONT_FAMILY } from '../ui/theme';
import type { GameInfo } from './registry';

/** Stand-in for a game that hasn't been built yet: a solid colored canvas. */
export class PlaceholderGame extends Scene {
  private bg = new Graphics();
  private title: Text;
  private backButton: Button;

  constructor(scenes: SceneManager, private info: GameInfo) {
    super();
    this.title = new Text({
      text: `${info.title}\n\nComing soon!`,
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: 56,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center',
        dropShadow: { color: 0x000000, alpha: 0.3, distance: 4, blur: 0, angle: Math.PI / 2 },
      },
    });
    this.title.anchor.set(0.5);

    this.backButton = new Button({
      label: '← Menu',
      width: 160,
      height: 64,
      color: DARK,
      onClick: () => scenes.goTo(new MenuScene(scenes)),
    });

    this.addChild(this.bg, this.title, this.backButton);
  }

  resize(width: number, height: number): void {
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.title.position.set(width / 2, height / 2);
    this.title.scale.set(Math.min(1, width / 600));
    this.backButton.position.set(16 + 80, 16 + 32);
  }
}
