import { tone } from '../../core/sfx';

/** Rises in pitch with each letter of the word. */
export function playCorrect(position: number): void {
  const frequency = 440 * Math.pow(1.12, position);
  tone(frequency, 'sine', 0.14);
  tone(frequency * 1.25, 'sine', 0.1, 0.08, 0.15);
}

export function playIncorrect(): void {
  tone(200, 'sawtooth', 0.18);
  tone(160, 'sawtooth', 0.18, 0.12);
}

export const playWordDone = () => [523, 659, 784].forEach((f, i) => tone(f, 'sine', 0.25, i * 0.1));
export const playWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.1));
export const playLose = () => [300, 250, 200].forEach((f, i) => tone(f, 'sawtooth', 0.28, i * 0.16));

export function playHint(): void {
  tone(600, 'sine', 0.1);
  tone(400, 'sine', 0.15, 0.1);
  tone(180, 'sawtooth', 0.22, 0.15);
}

export const playTick = () => tone(1200, 'square', 0.04, 0, 0.12);
