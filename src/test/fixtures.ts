import type { AppState, HskWord, Settings } from '../lib/types';
import { DEFAULT_SETTINGS, initialState } from '../state/defaults';

const w = (s: string, t: string, p: string, n: string, m: string[], l: number, q: number, c: string[] = [], poly = false): HskWord =>
  ({ s, t, p, n, m, l, q, c, poly });

export const POOL: HskWord[] = [
  w('了', '了', 'le', 'le5', ['(completed action marker)'], 1, 50, [], true),
  w('书', '書', 'shū', 'shu1', ['book'], 1, 100, ['本']),
  w('进', '進', 'jìn', 'jin4', ['to enter'], 1, 150),
  w('汽车', '汽車', 'qì chē', 'qi4 che1', ['car; automobile'], 1, 200, ['辆']),
  w('爱好', '愛好', 'ài hào', 'ai4 hao4', ['to like; to be fond of', 'interest; hobby'], 1, 300, ['个']),
  w('桌子', '桌子', 'zhuō zi', 'zhuo1 zi5', ['table; desk'], 1, 400, ['张']),
  w('安静', '安靜', 'ān jìng', 'an1 jing4', ['quiet; peaceful'], 2, 500),
  w('金', '金', 'jīn', 'jin1', ['gold'], 2, 550),
  w('近', '近', 'jìn', 'jin4', ['near'], 2, 560),
  w('河', '河', 'hé', 'he2', ['river'], 2, 600, ['条']),
  w('机会', '機會', 'jī huì', 'ji1 hui4', ['opportunity; chance'], 3, 700, ['个']),
  w('绿色', '綠色', 'lǜ sè', 'lü4 se4', ['green'], 3, 800),
  w('经济', '經濟', 'jīng jì', 'jing1 ji4', ['economy; economic'], 4, 900),
  w('环境', '環境', 'huán jìng', 'huan2 jing4', ['environment; surroundings'], 4, 1000),
  w('犹豫', '猶豫', 'yóu yù', 'you2 yu4', ['to hesitate'], 5, 1100),
  w('一帆风顺', '一帆風順', 'yī fān fēng shùn', 'yi1 fan1 feng1 shun4', ['plain sailing; to go smoothly'], 7, 1200),
];

export const TODAY = '2026-11-08';

export function makeState(patch: Partial<AppState> = {}, settings: Partial<Settings> = {}): AppState {
  return {
    ...initialState,
    onboarded: true,
    ...patch,
    settings: { ...DEFAULT_SETTINGS, levels: [1], wordsPerDay: 3, ...settings },
  };
}
