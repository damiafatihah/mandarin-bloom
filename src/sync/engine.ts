import type { AppState } from '../lib/types';
import type { SyncBackend, SyncUser } from './backend';
import { mergeStates } from './merge';

/**
 * One sync = pull the cloud copy, combine it with this device's progress, save the result back,
 * and hand the cloud copy to the app to combine locally (so changes made meanwhile aren't lost).
 * Calls that arrive while a sync is running are folded into one more run afterwards.
 */
export function createSyncEngine(o: {
  backend: SyncBackend;
  getState: () => AppState;
  applyRemote: (remote: AppState) => void;
}) {
  let running: Promise<void> | null = null;
  let again = false;
  let lastSynced = '';

  async function once(user: SyncUser) {
    const remote = await o.backend.pull(user);
    const local = o.getState();
    const merged = remote ? mergeStates(local, remote) : local;
    const json = JSON.stringify(merged);
    if (!remote || json !== JSON.stringify(remote)) await o.backend.push(user, merged);
    if (remote) o.applyRemote(remote);
    lastSynced = json;
  }

  return {
    /** True when this device has changes the cloud hasn't seen. */
    hasUnsynced: (state: AppState) => JSON.stringify(state) !== lastSynced,
    async sync(user: SyncUser): Promise<void> {
      if (running) {
        again = true;
        return running;
      }
      running = (async () => {
        try {
          do {
            again = false;
            await once(user);
          } while (again);
        } finally {
          running = null;
        }
      })();
      return running;
    },
  };
}
