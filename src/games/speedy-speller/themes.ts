import { DARK } from '../../ui/theme';

export type SpellerThemeId = 'tortoise' | 'cloud' | 'space';
export type TileLook = 'idle' | 'picked' | 'wrong' | 'hint';

export interface TileColors {
  fill: number;
  rim: number;
  text: number;
}

export interface SpellerTheme {
  id: SpellerThemeId;
  background: number;
  /** Tiles bob gently up and down. */
  floats: boolean;
  looks: Record<TileLook, TileColors>;
}

const WRONG: TileColors = { fill: 0xe53935, rim: 0xb71c1c, text: 0xffffff };
const HINT: TileColors = { fill: 0xfff176, rim: 0xf9a825, text: DARK };

/** Turtles in a pond, clouds in the sky and meteors in space. */
export const THEMES: Record<SpellerThemeId, SpellerTheme> = {
  tortoise: {
    id: 'tortoise',
    background: 0x1e88e5,
    floats: false,
    looks: {
      idle: { fill: 0x43a047, rim: 0x2e7d32, text: 0xffffff },
      picked: { fill: 0xfdd835, rim: 0xf9a825, text: DARK },
      wrong: WRONG,
      hint: HINT,
    },
  },
  cloud: {
    id: 'cloud',
    background: 0x6ab8f0,
    floats: true,
    looks: {
      idle: { fill: 0xffffff, rim: 0xe0e0e0, text: DARK },
      picked: { fill: 0x1e88e5, rim: 0x1565c0, text: 0xffffff },
      wrong: { fill: 0xffcdd2, rim: 0xe53935, text: DARK },
      hint: HINT,
    },
  },
  space: {
    id: 'space',
    background: 0x1a1a2e,
    floats: true,
    looks: {
      idle: { fill: 0x8e24aa, rim: 0xce93d8, text: 0xffffff },
      picked: { fill: 0x90caf9, rim: 0x1e88e5, text: DARK },
      wrong: WRONG,
      hint: HINT,
    },
  },
};
