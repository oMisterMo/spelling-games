import { tone } from '../../core/sfx';

/** Rises in pitch with each letter of the word. */
export function playCatch(position: number): void {
  const frequency = 523 * Math.pow(1.1, position);
  tone(frequency, 'sine', 0.16);
  tone(frequency * 1.5, 'sine', 0.12, 0.07, 0.14);
}

export function playMiss(): void {
  tone(220, 'triangle', 0.16);
  tone(175, 'triangle', 0.2, 0.1);
}

export const playWordDone = () => [523, 659, 784].forEach((f, i) => tone(f, 'sine', 0.25, i * 0.1));
export const playWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.1));
