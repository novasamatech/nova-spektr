import { describe, expect, test } from 'vitest';

import {
  allAccounts,
  allChains,
  allWallets,
  flexMultisigAccount1,
  flexMultisigAccount2,
  flexMultisigAccount3,
  flexMultisigWallet1,
  flexMultisigWallet2,
  flexMultisigWallet3,
  syncResult,
  userAccount,
} from './__mocks__/sync.flexMultisig.mocks';
import { type SyncFlexibleMultisigParams, syncFlexibleMultisigs } from './sync';

describe('syncFlexibleMultisigs', () => {
  test('should index all accounts when initialised', () => {
    const result = syncFlexibleMultisigs({
      allWallets,
      allAccounts: [userAccount],
      allChains: allChains,
      syncResult,
      identities: {},
    } as unknown as SyncFlexibleMultisigParams);
    expect(result).toEqual({
      createWallets: [
        {
          wallet: { name: '1T6zT...XrN8U', type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount1.accountId,
              accountType: flexMultisigAccount1.accountType,
              blockNumber: flexMultisigAccount1.blockNumber,
              chainId: flexMultisigAccount1.chainId,
              cryptoType: flexMultisigAccount1.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount1.extrinsicIndex,
              multisigAccountId: flexMultisigAccount1.multisigAccountId,
              name: '1T6zT...XrN8U',
              signatories: flexMultisigAccount1.signatories,
              signingType: flexMultisigAccount1.signingType,
              threshold: flexMultisigAccount1.threshold,
              type: flexMultisigAccount1.type,
            },
          ],
        },
        {
          wallet: { name: flexMultisigAccount2.name, type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount2.accountId,
              accountType: flexMultisigAccount2.accountType,
              blockNumber: flexMultisigAccount2.blockNumber,
              chainId: flexMultisigAccount2.chainId,
              cryptoType: flexMultisigAccount2.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount2.extrinsicIndex,
              multisigAccountId: flexMultisigAccount2.multisigAccountId,
              name: flexMultisigAccount2.name,
              signatories: flexMultisigAccount2.signatories,
              signingType: flexMultisigAccount2.signingType,
              threshold: flexMultisigAccount2.threshold,
              type: flexMultisigAccount2.type,
            },
          ],
        },
        {
          wallet: { name: flexMultisigAccount3.name, type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount3.accountId,
              accountType: flexMultisigAccount3.accountType,
              blockNumber: flexMultisigAccount3.blockNumber,
              chainId: flexMultisigAccount3.chainId,
              cryptoType: flexMultisigAccount3.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount3.extrinsicIndex,
              multisigAccountId: flexMultisigAccount3.multisigAccountId,
              name: flexMultisigAccount3.name,
              signatories: flexMultisigAccount3.signatories,
              signingType: flexMultisigAccount3.signingType,
              threshold: flexMultisigAccount3.threshold,
              type: flexMultisigAccount3.type,
            },
          ],
        },
      ],
      deleteWallets: [],
    });
  });

  test('should stay immutable when DB is up to date', () => {
    const result = syncFlexibleMultisigs({
      allWallets,
      allAccounts,
      allChains: allChains,
      syncResult,
      identities: {},
    } as unknown as SyncFlexibleMultisigParams);
    expect(result).toEqual({
      createWallets: [],
      deleteWallets: [],
    });
  });

  test('should delete wallet of non-existent account', () => {
    const nonExistentFlexMultisigAccount = {
      ...flexMultisigAccount1,
      accountId: '0xnonexistentaccountid123456789abcdef0000000000000000000000000000',
      walletId: 999,
      id: '999 0xnonexistentaccountid123456789abcdef0000000000000000000000000000 0x3dbb473ae9b2b77ecf077c03546f0f8670c020e453dddb457da155e6cc7cba42',
    };

    const walletToDelete = {
      name: 'Non-existent Wallet',
      type: 'wallet_fxms',
      id: 999,
      accounts: [nonExistentFlexMultisigAccount],
    };

    const result = syncFlexibleMultisigs({
      allWallets: [...allWallets, walletToDelete],
      allAccounts: [...allAccounts, nonExistentFlexMultisigAccount],
      allChains: allChains,
      syncResult,
      identities: {},
    } as unknown as SyncFlexibleMultisigParams);

    expect(result.deleteWallets).toEqual([999]);
    expect(result.createWallets).toEqual([]);
  });

  test('should not rename wallet if just signatories have changed for flexible multisig', () => {
    const modifiedSyncResult = {
      ...syncResult,
      accounts: [
        ...syncResult.accounts.filter(
          (acc) => acc.type !== 'multisig' || acc.accountId !== flexMultisigAccount1.multisigAccountId,
        ),
        {
          type: 'multisig',
          accountId: flexMultisigAccount1.multisigAccountId,
          signatories: [
            '0x589f4a92b7e88c0ac1172e429f12bde262d34fac77b0931eb94963996a207724',
            '0xdifferentsignatory123456789abcdef0000000000000000000000000000000',
          ],
          threshold: 2,
        },
      ],
    };

    const result = syncFlexibleMultisigs({
      allWallets,
      allAccounts,
      allChains: allChains,
      syncResult: modifiedSyncResult,
      identities: {},
    } as unknown as SyncFlexibleMultisigParams);

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([]);
  });

  test('should delete all flexible multisig wallets when sync result accounts is empty', () => {
    const emptySyncResult = {
      ...syncResult,
      accounts: [],
    };

    const result = syncFlexibleMultisigs({
      allWallets,
      allAccounts: [flexMultisigAccount1, flexMultisigAccount2, flexMultisigAccount3],
      allChains: allChains,
      syncResult: emptySyncResult,
      identities: {},
    } as unknown as SyncFlexibleMultisigParams);

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([flexMultisigWallet1.id, flexMultisigWallet2.id, flexMultisigWallet3.id]);
  });
});
