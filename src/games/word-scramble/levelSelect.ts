import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { LEVELS } from './levels';
import { WordScrambleGame } from './WordScrambleGame';

export function wordScrambleLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: `${level.rounds} words`,
      color: level.color,
      start: () => new WordScrambleGame(scenes, info, level),
    })),
  );
}
