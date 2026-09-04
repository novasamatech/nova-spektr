import { BN, BN_ZERO } from '@polkadot/util';
import { vi } from 'vitest';

import { type Wallet, SigningType, WalletType } from '@/shared/core';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { type LocksTableState } from '../../hooks/useLocksTable';
import { type GovernanceLockRow } from '../buildLockRows';

/**
 * The account every fixture row is locked on, and the local key that signs for
 * it. Shared by the lock table, its cells and the full-screen view so a row
 * built in one suite reads the same as in the others.
 */
export const lockedId = createAccountId('locked');

export const wallet: Wallet = { id: 1, name: 'Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };

export const signer: AnyAccount = {
  id: 'signer',
  type: 'universal',
  name: '',
  walletId: wallet.id,
  accountId: lockedId,
  cryptoType: 0,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

/**
 * A releasable Polkadot row: 100 DOT locked, all of it claimable now, signed by
 * the locked account itself. Suites that care about a different shape override
 * only the fields they assert on.
 */
export const makeLockRow = (overrides: Partial<GovernanceLockRow> = {}): GovernanceLockRow => ({
  key: 'row',
  accountId: lockedId,
  chainId: polkadotChainId,
  chain: polkadotChain,
  chainName: 'Polkadot',
  chainIcon: 'polkadot.svg',
  symbol: 'DOT',
  precision: 10,
  wallet,
  locked: new BN('1000000000000'),
  lockedFiat: null,
  claimable: new BN('1000000000000'),
  claimableFiat: null,
  claimableActions: [{ type: 'unlock', trackId: '0' }],
  pending: BN_ZERO,
  pendingFiat: null,
  nextUnlockAtMs: null,
  daysUntilNextUnlock: null,
  delegated: BN_ZERO,
  delegatedFiat: null,
  delegations: [],
  undelegateActions: [],
  undelegateInitiator: null,
  undelegateBlockReason: null,
  tracks: ['0'],
  initiator: signer,
  target: lockedId,
  blockReason: null,
  claimableNum: 1e12,
  lockedNum: 1e12,
  ...overrides,
});

/**
 * The state `useLocksTable` hands the table and the full-screen view. `rows` is
 * an override like any other, and `visibleRows` follows it unless a suite is
 * pinning what the filters hide.
 */
export const makeLocksTableState = (overrides: Partial<LocksTableState> = {}): LocksTableState => {
  const rows = overrides.rows ?? [];

  return {
    rows,
    visibleRows: rows,
    pending: false,
    fiatFlag: false,
    currency: null,
    totals: null,
    showTotals: false,
    uniqueChains: [],
    chainFilter: null,
    setChainFilter: vi.fn(),
    claimableOnly: false,
    setClaimableOnly: vi.fn(),
    onUnlock: vi.fn(),
    onUndelegate: vi.fn(),
    ...overrides,
  };
};
