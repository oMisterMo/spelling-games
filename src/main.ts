import { Application } from 'pixi.js';
import { SceneManager } from './core/SceneManager';
import { MenuScene } from './scenes/MenuScene';

async function start() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#2b2d42',
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  document.body.appendChild(app.canvas);

  // Lets the PixiJS DevTools browser extension (and test scripts) inspect the scene graph.
  if (import.meta.env.DEV) (globalThis as { __PIXI_APP__?: Application }).__PIXI_APP__ = app;

  const scenes = new SceneManager(app);
  scenes.goTo(new MenuScene(scenes));
}

start();
