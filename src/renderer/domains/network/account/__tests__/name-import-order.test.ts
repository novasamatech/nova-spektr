import { allSettled, fork } from 'effector';

// Loads the contact entity BEFORE the name resource: its UI barrel reaches
// back into domains/network, which is the order that used to hand the
// resource an undefined contactModel and silently resolve without contacts.
// eslint-disable-next-line import-x/order
import { contactModel } from '@/entities/contact';

import { $walletNameCache, createWalletNameCacheKey, walletsNameResource } from '../resource';
import { accounts } from '../store';

import { createMultisigAccount, createMultisigWallet, multisigContact } from './name-freshness.fixtures';

describe('wallet name resolution under either import order', () => {
  it('should see address-book contacts when the contact entity is loaded first', async () => {
    const wallet = createMultisigWallet(1);
    const scope = fork({ values: [[accounts.__test.$list, [createMultisigAccount(wallet.id)]]] });

    await allSettled(contactModel.events.backendContactsReceived, { scope, params: [multisigContact] });
    await allSettled(walletsNameResource.start, { scope, params: { wallets: [wallet] } });

    expect(scope.getState($walletNameCache)[createWalletNameCacheKey({ wallet })]).toBe('FINOPS_DOT_MSIG');
  });
});
