import { allSettled, fork } from 'effector';

import { $walletNameCache, createWalletNameCacheKey, trackNameParams, walletsNameResource } from '../resource';
import { accounts } from '../store';
// Imported after the resource on purpose, the way the app loads them; the
// reverse order is covered by name-import-order.test.ts.
// eslint-disable-next-line import-x/order
import { contactModel } from '@/entities/contact';

import { createMultisigAccount, createMultisigWallet, multisigContact } from './name-freshness.fixtures';

const flushMicrotasks = async (count: number) => {
  for (let i = 0; i < count; i++) await Promise.resolve();
};

describe('wallet name freshness', () => {
  // The address book arrives over HTTP at an arbitrary moment. Whenever it
  // lands relative to a name request that is already in flight, the name must
  // end up resolved from it — never frozen on the pre-contacts short address.
  it.each(Array.from({ length: 13 }, (_, ticks) => ticks))(
    'should resolve the contact name when contacts land %i microtasks into the request',
    async ticks => {
      const wallet = createMultisigWallet(100 + ticks);
      const scope = fork({ values: [[accounts.__test.$list, [createMultisigAccount(wallet.id)]]] });

      const request = allSettled(walletsNameResource.start, { scope, params: { wallets: [wallet] } });
      await flushMicrotasks(ticks);
      await allSettled(contactModel.events.backendContactsReceived, { scope, params: [multisigContact] });
      await request;

      expect(scope.getState($walletNameCache)[createWalletNameCacheKey({ wallet })]).toBe('FINOPS_DOT_MSIG');
    },
  );

  it('should resolve the contact name when contacts land after the name was resolved', async () => {
    const wallet = createMultisigWallet(200);
    const scope = fork({ values: [[accounts.__test.$list, [createMultisigAccount(wallet.id)]]] });

    await allSettled(walletsNameResource.start, { scope, params: { wallets: [wallet] } });
    await allSettled(contactModel.events.backendContactsReceived, { scope, params: [multisigContact] });

    expect(scope.getState($walletNameCache)[createWalletNameCacheKey({ wallet })]).toBe('FINOPS_DOT_MSIG');
  });
});

describe('trackNameParams', () => {
  it('should evict the least recently used params, not the oldest inserted', () => {
    const tracked = trackNameParams({ a: 1, b: 2 }, [['a', 1]], 2);
    const next = trackNameParams(tracked, [['c', 3]], 2);

    expect(Object.keys(next)).toEqual(['a', 'c']);
  });
});
