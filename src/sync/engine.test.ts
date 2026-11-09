import { describe, expect, it } from 'vitest';
import { createSyncEngine } from './engine';
import { mergeStates } from './merge';
import { memoryBackend } from '../test/memoryBackend';
import { makeState } from '../test/fixtures';
import type { AppState } from '../lib/types';

const ME = { id: 'me@x.com', email: 'me@x.com' };
const card = (seen: number) => ({ box: 0, due: '2026-11-10', seen, correct: 0 });

function device(backend: ReturnType<typeof memoryBackend>['backend'], start: AppState) {
  let state = start;
  const engine = createSyncEngine({ backend, getState: () => state, applyRemote: (r) => { state = mergeStates(state, r); } });
  return { engine, get: () => state, set: (s: AppState) => { state = s; } };
}

describe('sync engine', () => {
  it('first device: empty cloud gets this device’s progress', async () => {
    const { backend, cloud } = memoryBackend();
    const laptop = device(backend, makeState({ cards: { 书: card(1) } }));
    await laptop.engine.sync(ME);
    expect(cloud.get(ME.id)?.cards).toEqual({ 书: card(1) });
  });

  it('second device: gets the laptop’s words and adds its own; both end up the same', async () => {
    const shared = new Map<string, AppState>();
    const laptop = device(memoryBackend(shared).backend, makeState({ cards: { 书: card(1) }, known: ['河'] }));
    const phone = device(memoryBackend(shared).backend, makeState({ cards: { 金: card(2) } }));
    await laptop.engine.sync(ME);
    await phone.engine.sync(ME);
    expect(Object.keys(phone.get().cards).sort()).toEqual(['书', '金'].sort());
    expect(phone.get().known).toEqual(['河']);
    await laptop.engine.sync(ME);
    expect(laptop.get().cards).toEqual(phone.get().cards);
    expect(shared.get(ME.id)!.cards).toEqual(phone.get().cards);
  });

  it('skips the upload when the cloud already has everything', async () => {
    const { backend } = memoryBackend();
    const d = device(backend, makeState({ cards: { 书: card(1) } }));
    await d.engine.sync(ME);
    await d.engine.sync(ME);
    expect(backend.push).toHaveBeenCalledTimes(1);
    expect(d.engine.hasUnsynced(d.get())).toBe(false);
    d.set(makeState({ cards: { 书: card(2) } }));
    expect(d.engine.hasUnsynced(d.get())).toBe(true);
  });

  it('several sync requests at once run at most twice', async () => {
    const { backend } = memoryBackend();
    const d = device(backend, makeState());
    await Promise.all([d.engine.sync(ME), d.engine.sync(ME), d.engine.sync(ME)]);
    expect(backend.pull.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('a failed pull is reported and nothing is uploaded', async () => {
    const { backend } = memoryBackend();
    backend.pull.mockRejectedValueOnce(new Error('offline'));
    const d = device(backend, makeState());
    await expect(d.engine.sync(ME)).rejects.toThrow('offline');
    expect(backend.push).not.toHaveBeenCalled();
    await d.engine.sync(ME); // and the next try works
    expect(backend.push).toHaveBeenCalledTimes(1);
  });
});
