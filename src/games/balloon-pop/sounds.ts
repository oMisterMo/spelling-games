import { tone } from '../../core/sfx';

export function playCorrect(): void {
  tone(660, 'sine', 0.14);
  tone(880, 'sine', 0.12, 0.08, 0.15);
}

export function playPop(): void {
  tone(1000, 'square', 0.04, 0, 0.2);
  tone(140, 'sawtooth', 0.14, 0.03);
}

export const playWordDone = () => [523, 659, 784].forEach((f, i) => tone(f, 'sine', 0.25, i * 0.1));
export const playWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.1));
export const playLanded = () => [330, 262].forEach((f, i) => tone(f, 'triangle', 0.3, 0.35 + i * 0.18));
