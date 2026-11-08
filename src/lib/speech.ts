export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function chineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'zh-CN') ?? voices.find((v) => v.lang.toLowerCase().startsWith('zh'));
}

export function speak(text: string, rate = 0.9): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  const voice = chineseVoice();
  if (voice) u.voice = voice;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
