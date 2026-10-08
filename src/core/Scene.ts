import { Container, Ticker } from 'pixi.js';

/**
 * Base class for every screen (the menu and each game).
 * Subclasses build their display objects in the constructor or `onEnter`,
 * lay them out in `resize`, and clean up in `onExit`.
 */
export abstract class Scene extends Container {
  onEnter(): void {}
  onExit(): void {}
  update(_ticker: Ticker): void {}
  abstract resize(width: number, height: number): void;
}
