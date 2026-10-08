import { Graphics, Text } from 'pixi.js';
import { Scene } from '../core/Scene';
import type { SceneManager } from '../core/SceneManager';
import type { GameInfo } from '../games/registry';
import { Button } from '../ui/Button';
import { DARK, FONT_FAMILY } from '../ui/theme';
import { MenuScene } from './MenuScene';

export interface LevelChoice {
  label: string;
  /** Second line on the button, e.g. "6 × 6". */
  detail: string;
  color: number;
  start: () => Scene;
}

/** "Choose a level" screen shared by every game. */
export class LevelSelectScene extends Scene {
  private bg = new Graphics();
  private title: Text;
  private backButton: Button;
  private levelButtons: Button[];

  constructor(scenes: SceneManager, private info: GameInfo, levels: LevelChoice[]) {
    super();
    const textColor = info.textColor ?? 0xffffff;
    this.title = new Text({
      text: `${info.title}\nChoose a level`,
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: 56,
        fontWeight: 'bold',
        fill: textColor,
        align: 'center',
        dropShadow:
          info.textColor === undefined
            ? { color: 0x000000, alpha: 0.3, distance: 4, blur: 0, angle: Math.PI / 2 }
            : false,
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

    this.levelButtons = levels.map(
      (level) =>
        new Button({
          label: `${level.label}\n${level.detail}`,
          width: 220,
          height: 140,
          color: level.color,
          fontSize: 32,
          onClick: () => scenes.goTo(level.start()),
        }),
    );

    this.addChild(this.bg, this.title, this.backButton, ...this.levelButtons);
  }

  resize(width: number, height: number): void {
    const margin = 24;
    const gap = 24;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.backButton.position.set(16 + 80, 16 + 32);

    const top = 96;
    this.title.scale.set(1);
    this.title.scale.set(Math.min(1, (width - margin * 2) / this.title.width, (height * 0.3) / this.title.height));
    this.title.position.set(width / 2, top + this.title.height / 2);

    const n = this.levelButtons.length;
    const areaTop = top + this.title.height + gap;
    const areaH = height - areaTop - margin;
    const inRow = width >= 760;
    const buttonW = inRow ? Math.min(260, (width - margin * 2 - gap * (n - 1)) / n) : Math.min(360, width - margin * 2);
    const buttonH = inRow
      ? Math.min(180, areaH)
      : Math.max(64, Math.min(140, (areaH - gap * (n - 1)) / n));

    const groupW = inRow ? n * buttonW + (n - 1) * gap : buttonW;
    const groupH = inRow ? buttonH : n * buttonH + (n - 1) * gap;
    const startX = (width - groupW) / 2;
    const startY = areaTop + Math.max(0, (areaH - groupH) / 2);

    this.levelButtons.forEach((button, i) => {
      button.setSize(buttonW, buttonH);
      button.position.set(
        startX + buttonW / 2 + (inRow ? i * (buttonW + gap) : 0),
        startY + buttonH / 2 + (inRow ? 0 : i * (buttonH + gap)),
      );
    });
  }
}
