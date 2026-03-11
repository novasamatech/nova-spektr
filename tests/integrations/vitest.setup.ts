import { type Unit, launch } from 'effector';
import { vi } from 'vitest';

// Mock IDB persistence adapter to prevent global IndexedDB subscriptions
// from `spektr-cache` database that cause cross-test I/O contention.
//
// Module-level `persist()` calls (in ~10 source modules) create subscriptions
// that bypass Effector's `fork()` isolation — all scopes write to the same
// `spektr-cache` IDB. Under parallel execution this serializes I/O and
// causes timeouts.
//
// The mock fires the `done` callback synchronously (with the store's default
// value) so downstream logic that depends on it (e.g. `$populated` in
// multisig-operation/store.ts) isn't blocked.
vi.mock('@effector-storage/idb-keyval', () => ({
  persist: ({ store, done }: { store: { getState: () => unknown }; done?: Unit<{ key: string; value: unknown }> }) => {
    if (done) {
      const value = store.getState();
      queueMicrotask(() => {
        launch(done, { key: '', value });
      });
    }
  },
}));
