import { describe, expect, test } from 'vitest';

import { type SyncFlexibleMultisigParams, syncFlexibleMultisigs } from '../sync';

import {
  allAccounts,
  allWallets,
  flexMultisigAccount1,
  flexMultisigAccount2,
  flexMultisigAccount3,
  flexMultisigAccount4,
  flexMultisigAccount5,
  flexMultisigAccount6,
  flexMultisigAccount7,
  flexMultisigWallet1,
  flexMultisigWallet2,
  flexMultisigWallet3,
  flexMultisigWallet4,
  flexMultisigWallet5,
  flexMultisigWallet6,
  flexMultisigWallet7,
  syncResult,
  userAccount,
} from './mocks/syncFlexibleMultisigs-data';

describe('syncFlexibleMultisigs', () => {
  test('should index all accounts when initialised', () => {
    const result = syncFlexibleMultisigs({
      allWallets,
      allAccounts: [userAccount],
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
        {
          wallet: { name: flexMultisigAccount4.name, type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount4.accountId,
              accountType: flexMultisigAccount4.accountType,
              blockNumber: flexMultisigAccount4.blockNumber,
              chainId: flexMultisigAccount4.chainId,
              cryptoType: flexMultisigAccount4.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount4.extrinsicIndex,
              multisigAccountId: flexMultisigAccount4.multisigAccountId,
              name: flexMultisigAccount4.name,
              signatories: flexMultisigAccount4.signatories,
              signingType: flexMultisigAccount4.signingType,
              threshold: flexMultisigAccount4.threshold,
              type: flexMultisigAccount4.type,
            },
          ],
        },
        {
          wallet: { name: flexMultisigAccount5.name, type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount5.accountId,
              accountType: flexMultisigAccount5.accountType,
              blockNumber: flexMultisigAccount5.blockNumber,
              chainId: flexMultisigAccount5.chainId,
              cryptoType: flexMultisigAccount5.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount5.extrinsicIndex,
              multisigAccountId: flexMultisigAccount5.multisigAccountId,
              name: flexMultisigAccount5.name,
              signatories: flexMultisigAccount5.signatories,
              signingType: flexMultisigAccount5.signingType,
              threshold: flexMultisigAccount5.threshold,
              type: flexMultisigAccount5.type,
            },
          ],
        },
        {
          wallet: { name: flexMultisigAccount6.name, type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount6.accountId,
              accountType: flexMultisigAccount6.accountType,
              blockNumber: flexMultisigAccount6.blockNumber,
              chainId: flexMultisigAccount6.chainId,
              cryptoType: flexMultisigAccount6.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount6.extrinsicIndex,
              multisigAccountId: flexMultisigAccount6.multisigAccountId,
              name: flexMultisigAccount6.name,
              signatories: flexMultisigAccount6.signatories,
              signingType: flexMultisigAccount6.signingType,
              threshold: flexMultisigAccount6.threshold,
              type: flexMultisigAccount6.type,
            },
          ],
        },
        {
          wallet: { name: flexMultisigAccount7.name, type: 'wallet_fxms' },
          accounts: [
            {
              accountId: flexMultisigAccount7.accountId,
              accountType: flexMultisigAccount7.accountType,
              blockNumber: flexMultisigAccount7.blockNumber,
              chainId: flexMultisigAccount7.chainId,
              cryptoType: flexMultisigAccount7.cryptoType,
              deposit: '12345',
              extrinsicIndex: flexMultisigAccount7.extrinsicIndex,
              multisigAccountId: flexMultisigAccount7.multisigAccountId,
              name: flexMultisigAccount7.name,
              signatories: flexMultisigAccount7.signatories,
              signingType: flexMultisigAccount7.signingType,
              threshold: flexMultisigAccount7.threshold,
              type: flexMultisigAccount7.type,
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
      allAccounts: [
        flexMultisigAccount1,
        flexMultisigAccount2,
        flexMultisigAccount3,
        flexMultisigAccount4,
        flexMultisigAccount5,
        flexMultisigAccount6,
        flexMultisigAccount7,
      ],
      syncResult: emptySyncResult,
      identities: {},
    } as unknown as SyncFlexibleMultisigParams);

    expect(result.createWallets).toEqual([]);
    expect(result.deleteWallets).toEqual([
      flexMultisigWallet1.id,
      flexMultisigWallet2.id,
      flexMultisigWallet3.id,
      flexMultisigWallet4.id,
      flexMultisigWallet5.id,
      flexMultisigWallet6.id,
      flexMultisigWallet7.id,
    ]);
  });
});
