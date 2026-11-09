import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { StoreProvider } from '../state/store';
import { STORAGE_KEY } from '../state/storage';
import { SyncProvider } from '../sync/SyncProvider';
import { setBackendForTests } from '../sync/backend';
import { memoryBackend } from '../test/memoryBackend';
import { makeState } from '../test/fixtures';
import { SyncPanel } from './SyncPanel';

afterEach(() => setBackendForTests(undefined));

const mount = () => render(<StoreProvider><SyncProvider><SyncPanel /></SyncProvider></StoreProvider>);
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

it('shows nothing when sync is not set up', async () => {
  setBackendForTests(null);
  const { container } = mount();
  await flush();
  expect(container).toBeEmptyDOMElement();
});

it('signed out: email me a link, then says to check email', async () => {
  const { backend } = memoryBackend();
  setBackendForTests(backend);
  mount();
  await flush();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' me@x.com ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Email me a link' }));
  await flush();
  expect(backend.sendLink).toHaveBeenCalledWith('me@x.com');
  expect(screen.getByRole('status')).toHaveTextContent('Check me@x.com for a sign-in link');
});

it('opening the link signs in and syncs: this device’s progress goes to the cloud', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({ known: ['河'] })));
  const { backend, cloud } = memoryBackend();
  setBackendForTests(backend);
  mount();
  await flush();
  await act(async () => backend.openLink('me@x.com'));
  await flush();
  await flush();
  expect(screen.getByText(/Signed in as/)).toHaveTextContent('Signed in as me@x.com');
  expect(screen.getByRole('status')).toHaveTextContent('Synced just now');
  expect(cloud.get('me@x.com')?.known).toEqual(['河']);
});

it('signed in on a new device: the cloud progress arrives here', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...makeState(), onboarded: false }));
  const cloud = new Map([['me@x.com', makeState({ known: ['金', '近'] })]]);
  const { backend } = memoryBackend(cloud, 'me@x.com');
  setBackendForTests(backend);
  mount();
  await flush();
  await flush();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(saved.known).toEqual(['金', '近']);
  expect(saved.onboarded).toBe(true);
});

it('a sync error is explained, and progress stays on the device', async () => {
  const { backend } = memoryBackend(new Map(), 'me@x.com');
  backend.pull.mockRejectedValue(new Error('Failed to fetch'));
  setBackendForTests(backend);
  mount();
  await flush();
  await flush();
  expect(screen.getByRole('status')).toHaveTextContent('Couldn’t sync (Failed to fetch). Your progress is still saved on this device.');
  expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();
});

it('Sign out keeps progress on this device', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({ known: ['河'] })));
  const { backend } = memoryBackend(new Map(), 'me@x.com');
  setBackendForTests(backend);
  mount();
  await flush();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await flush();
  expect(backend.signOut).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Email me a link' })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).known).toEqual(['河']);
});
