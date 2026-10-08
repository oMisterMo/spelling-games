import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { CrosswordGame } from './CrosswordGame';
import { LEVELS } from './levels';

export function crosswordLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: `${level.wordCount} words`,
      color: level.color,
      start: () => new CrosswordGame(scenes, info, level),
    })),
  );
}
