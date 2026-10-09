import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { BalloonPopGame } from './BalloonPopGame';
import { LEVELS } from './levels';

export function balloonPopLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: `${level.balloons} balloons`,
      color: level.color,
      start: () => new BalloonPopGame(scenes, info, level),
    })),
  );
}
