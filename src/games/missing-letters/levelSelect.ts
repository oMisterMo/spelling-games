import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { LEVELS } from './levels';
import { MissingLettersGame } from './MissingLettersGame';

export function missingLettersLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: `${level.missing} missing letter${level.missing === 1 ? '' : 's'}`,
      color: level.color,
      start: () => new MissingLettersGame(scenes, info, level),
    })),
  );
}
