import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { LEVELS } from './levels';
import { WordSearchGame } from './WordSearchGame';

export function wordSearchLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: `${level.size} × ${level.size}`,
      color: level.color,
      start: () => new WordSearchGame(scenes, info, level),
    })),
  );
}
