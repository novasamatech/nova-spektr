import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { type Scope, allSettled } from 'effector';
import { vi } from 'vitest';

import {
  type Chain,
  type ChainId,
  type MultisigAccount,
  AccountType,
  AssetType,
  CryptoType,
  SigningType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';

export const TEST_CHAIN_ID = '0x0000000000000000000000000000000000000000000000000000000000000001' as ChainId;
export const OTHER_CHAIN_ID = '0x0000000000000000000000000000000000000000000000000000000000000002' as ChainId;

export const testChain = {
  chainId: TEST_CHAIN_ID,
  name: 'Test chain',
  addressPrefix: 0,
  options: [],
  assets: [{ assetId: 0, symbol: 'TST', name: 'Test', precision: 10, type: AssetType.NATIVE }],
  nodes: [],
} as unknown as Chain;

export const aId = (index: number): AccountId => `0x${String(index).padStart(64, '0')}` as AccountId;

export const vaultAccount = (accountId: AccountId, walletId = 1): AnyAccount =>
  ({
    id: `account-${accountId}-${walletId}`,
    walletId,
    accountId,
    name: `signer-${walletId}`,
    type: 'universal',
    accountType: AccountType.BASE,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
  }) as unknown as AnyAccount;

export const watchOnlyAccount = (accountId: AccountId, walletId = 1): AnyAccount =>
  ({
    ...(vaultAccount(accountId, walletId) as object),
    accountType: AccountType.WATCH_ONLY,
    signingType: SigningType.WATCH_ONLY,
  }) as unknown as AnyAccount;

export const chainScopedAccount = (accountId: AccountId, chainId: ChainId, walletId = 1): AnyAccount =>
  ({
    ...(vaultAccount(accountId, walletId) as object),
    type: 'chain',
    accountType: AccountType.CHAIN,
    chainId,
  }) as unknown as AnyAccount;

export const createMultisigAccount = (accountId: AccountId, signatories: AccountId[], threshold = 2): MultisigAccount =>
  ({
    id: `multisig-${accountId}`,
    walletId: 99,
    accountId,
    name: 'Test multisig',
    type: 'universal',
    accountType: AccountType.MULTISIG,
    cryptoType: CryptoType.SR25519,
    signatories: signatories.map(signatoryId => ({ accountId: signatoryId })),
    threshold,
    createdAt: 0,
  }) as unknown as MultisigAccount;

export const fakeWeight = { refTime: new BN(1), proofSize: new BN(0) } as unknown as Weight;

export const createFakeApi = (): ApiPromise => {
  const extrinsic = { isFakeExtrinsic: true };

  return {
    createType: vi.fn(() => fakeWeight),
    tx: {
      multisig: {
        // meta.args.length !== 6 → the modern (non-legacy) multisig pallet branch
        asMulti: Object.assign(
          vi.fn(() => extrinsic),
          { meta: { args: [] } },
        ),
        approveAsMulti: vi.fn(() => extrinsic),
        cancelAsMulti: vi.fn(() => extrinsic),
      },
    },
  } as unknown as ApiPromise;
};

/**
 * DI anyOf handlers resolve to empty scoped values under fork (a forked scope
 * starts from store initial values), so the availability and permission
 * handlers must be registered in-scope. They mirror production semantics:
 * universal accounts are reachable everywhere, chain-scoped accounts only on
 * their own chain; watch-only accounts cannot act.
 */
export const seedDiHandlers = async (scope: Scope) => {
  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: {
      available: () => true,
      body: ({ account, chain }) =>
        account.type === 'universal' || ('chainId' in account && account.chainId === chain.chainId),
    },
  });
  await allSettled(accountService.accountActionPermissionAnyOf.registerHandler, {
    scope,
    params: {
      available: () => true,
      body: ({ account }) => account.signingType !== SigningType.WATCH_ONLY,
    },
  });
};
