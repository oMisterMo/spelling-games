import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { FireflyCatchGame } from './FireflyCatchGame';
import { LEVELS } from './levels';

export function fireflyCatchLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: level.showWord ? 'Word shown' : `${level.extraLetters} extra letters`,
      color: level.color,
      start: () => new FireflyCatchGame(scenes, info, level),
    })),
  );
}
