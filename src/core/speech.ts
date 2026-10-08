/** Text-to-speech through the browser's built-in voices (Web Speech API). */

export const canSpeak =
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Says `text`, cutting off anything still being spoken. Does nothing if speech isn't supported. */
export function speak(text: string, { rate = 0.9 }: { rate?: number } = {}): void {
  if (!canSpeak) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.lang = 'en';
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const voice = voices.find((v) => v.localService) ?? voices[0];
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}
