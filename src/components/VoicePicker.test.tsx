import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeSynth, FakeUtterance, fakeVoice } from '../test/fakeSpeech';
import { __resetSpeech } from '../lib/speech';
import { VoicePicker } from './VoicePicker';

let synth: FakeSynth;
beforeEach(() => {
  vi.useFakeTimers();
  synth = new FakeSynth();
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  __resetSpeech();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('renders nothing until Chinese voices exist, then updates when they load', () => {
  render(<VoicePicker value="" onChange={() => {}} rate={0.9} />);
  expect(screen.queryByLabelText('Voice')).not.toBeInTheDocument();
  act(() => synth.setVoices([fakeVoice('Eddy (Chinese (China mainland))', 'zh-CN'), fakeVoice('Tingting', 'zh-CN'), fakeVoice('Samantha', 'en-US')]));
  const select = screen.getByLabelText('Voice') as HTMLSelectElement;
  const labels = [...select.options].map((o) => o.textContent);
  expect(labels[0]).toBe('Automatic (recommended)');
  expect(labels[1]).toBe('Tingting');
  expect(labels[2]).toBe('Eddy · novelty voice');
  expect(labels).toHaveLength(3);
});

it('choosing a voice saves it and plays a sample in that voice', () => {
  synth.setVoices([fakeVoice('Tingting', 'zh-CN'), fakeVoice('Meijia', 'zh-TW')]);
  const onChange = vi.fn();
  render(<VoicePicker value="" onChange={onChange} rate={0.9} />);
  fireEvent.change(screen.getByLabelText('Voice'), { target: { value: 'Meijia' } });
  vi.advanceTimersByTime(1000);
  expect(onChange).toHaveBeenCalledWith('Meijia');
  expect(synth.heard).toEqual(['你好@Meijia']);
});

it('falls back to Automatic when the saved voice no longer exists', () => {
  synth.setVoices([fakeVoice('Tingting', 'zh-CN')]);
  render(<VoicePicker value="Gone" onChange={() => {}} rate={0.9} />);
  expect((screen.getByLabelText('Voice') as HTMLSelectElement).value).toBe('');
});
