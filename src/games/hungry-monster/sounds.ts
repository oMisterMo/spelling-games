import { tone } from '../../core/sfx';

/** Three quick chomps. */
export const playMunch = () => [0, 0.16, 0.32].forEach((delay) => tone(180, 'square', 0.07, 0.3 + delay, 0.2));

export function playYuck(): void {
  tone(260, 'sawtooth', 0.2);
  tone(180, 'sawtooth', 0.25, 0.14);
}

export const playRight = () => [523, 784].forEach((f, i) => tone(f, 'sine', 0.18, i * 0.09));
export const playWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.1));
