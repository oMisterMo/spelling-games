import type { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { LevelSelectScene } from '../../scenes/LevelSelectScene';
import type { GameInfo } from '../registry';
import { HungryMonsterGame } from './HungryMonsterGame';
import { LEVELS } from './levels';

export function hungryMonsterLevelSelect(scenes: SceneManager, info: GameInfo): Scene {
  return new LevelSelectScene(
    scenes,
    info,
    LEVELS.map((level) => ({
      label: level.label,
      detail: `${level.choices} spellings`,
      color: level.color,
      start: () => new HungryMonsterGame(scenes, info, level),
    })),
  );
}
