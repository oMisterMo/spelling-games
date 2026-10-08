import { Application, Ticker } from 'pixi.js';
import { Scene } from './Scene';

export class SceneManager {
  private current: Scene | null = null;

  constructor(readonly app: Application) {
    app.ticker.add(this.tick, this);
    app.renderer.on('resize', this.onResize, this);
  }

  goTo(scene: Scene): void {
    if (this.current) {
      this.current.onExit();
      this.app.stage.removeChild(this.current);
      this.current.destroy({ children: true });
    }
    this.current = scene;
    this.app.stage.addChild(scene);
    scene.onEnter();
    scene.resize(this.app.screen.width, this.app.screen.height);
  }

  private tick(ticker: Ticker): void {
    this.current?.update(ticker);
  }

  private onResize(width: number, height: number): void {
    this.current?.resize(width, height);
  }
}
