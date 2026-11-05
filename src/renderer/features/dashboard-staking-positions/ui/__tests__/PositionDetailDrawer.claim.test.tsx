import { fireEvent, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { type Wallet, CryptoType, SigningType, WalletType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, dotAsset, polkadotAssetHubChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import type * as StakingDomain from '@/domains/staking';
import { type StakingPosition, type UnclaimedPayouts } from '@/domains/staking';
import { type PositionRow } from '../../lib';
import { positionActions } from '../../model/position-actions';
import { PositionDetailDrawer } from '../PositionDetailDrawer';

import { $unclaimedPayoutsOverride } from './domainMocks';

/**
 * The payout answer is the boundary. With no override the real domain hook
 * runs: the fork holds no api for the chain, so the scan has nothing to ask and
 * answers `unavailable` — an incomplete scan that found nothing.
 */
vi.mock('@/domains/staking', async (importOriginal) => {
  const actual = await importOriginal<typeof StakingDomain>();
  const { $unclaimedPayoutsOverride } = await import('./domainMocks');

  const useUnclaimedPayouts: typeof actual.useUnclaimedPayouts = (params) => {
    const override = useUnit($unclaimedPayoutsOverride);
    const real = actual.useUnclaimedPayouts(params);

    return override ?? real;
  };

  return { ...actual, useUnclaimedPayouts };
});

const accountId = createAccountId('drawer-claim-stash') as AccountId;

const position: StakingPosition = {
  accountId,
  chainId: polkadotAssetHubChain.chainId,
  stake: {
    accountId,
    chainId: polkadotAssetHubChain.chainId,
    controller: accountId,
    stash: accountId,
    active: '1000000000000',
    total: '1000000000000',
    unlocking: [],
  },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: [],
  redeemable: '0',
  totalUnbonding: '0',
  payee: 'Staked',
  payeeLoaded: true,
};

const localWallet: Wallet = { id: 1, name: 'My Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };

const localAccount: AnyAccount = {
  id: 'stash-account',
  accountId,
  walletId: localWallet.id,
  name: 'Stash',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const row: PositionRow = {
  id: `${polkadotAssetHubChain.chainId}-${accountId}`,
  position,
  accountId,
  chain: polkadotAssetHubChain,
  asset: dotAsset,
  account: localAccount,
  wallet: localWallet,
  access: { mode: 'direct' },
  multisig: null,
  status: 'active',
  staked: '1000000000000',
  sharePercent: 100,
  apy: null,
  activeValidatorCount: 0,
  nominationCount: 0,
  draftCount: 0,
  payee: 'Staked',
  payeeLoaded: true,
};

/**
 * `isAccountAvailableOnChain` answers through a DI `anyOf` read with
 * `getState()` from a React render, where a fork-scoped handler is invisible —
 * so the stand-in is registered globally, once, as the app does at startup. The
 * signer the chip looks for is then found in the fork-seeded account list.
 */
beforeAll(() => {
  accountService.accountAvailabilityOnChainAnyOf.registerHandler({
    body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
    available: () => true,
  });
});

const COMPLETE_EMPTY: UnclaimedPayouts = { total: '0', payouts: [], source: 'subquery', completeness: 'complete' };

const PARTIAL_WITH_PAYOUT: UnclaimedPayouts = {
  total: '12500000000',
  payouts: [{ era: 90, validator: createAccountId('drawer-claim-validator'), page: 0, amount: '12500000000' }],
  source: 'chain',
  completeness: 'partial',
};

const renderDrawer = (override: { data: UnclaimedPayouts; pending: boolean } | null = null) => {
  const scope = fork({
    values: [
      [positionActions.$wiredActions, ['claim']],
      [accounts.__test.$list, [localAccount]],
      [$unclaimedPayoutsOverride, override],
    ],
  });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <PositionDetailDrawer row={row} onClose={() => {}} />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

const NOTHING_TO_CLAIM = 'Nothing to claim on this position.';
const UNCLAIMED_UNKNOWN = "Unclaimed rewards couldn't be fully checked on this network.";

/** The chip sits in a Radix trigger `<div>`; focusing it opens the hint. */
const openChipHint = (chip: HTMLElement) => fireEvent.focus(chip.parentElement!);

describe('features/dashboard-staking-positions/ui/PositionDetailDrawer · Claim chip', () => {
  it('SP-45: disables Claim after an incomplete scan found nothing, without asserting there is nothing', async () => {
    renderDrawer();

    const chip = await screen.findByRole('button', { name: 'Claim' });
    expect(chip).toBeDisabled();

    openChipHint(chip);

    const hint = await screen.findByRole('tooltip');
    expect(hint).toHaveTextContent(UNCLAIMED_UNKNOWN);
    expect(hint).not.toHaveTextContent(NOTHING_TO_CLAIM);
  });

  it('SP-45: says nothing to claim only after a complete scan found nothing', async () => {
    renderDrawer({ data: COMPLETE_EMPTY, pending: false });

    const chip = await screen.findByRole('button', { name: 'Claim' });
    expect(chip).toBeDisabled();

    openChipHint(chip);

    const hint = await screen.findByRole('tooltip');
    expect(hint).toHaveTextContent(NOTHING_TO_CLAIM);
    expect(hint).not.toHaveTextContent(UNCLAIMED_UNKNOWN);
  });

  it('SP-45: keeps Claim live on an incomplete scan that still found a payout', async () => {
    // Claiming what is known is a valid claim — the chip names the amount and
    // does not wait for payouts the scan may never be able to see.
    renderDrawer({ data: PARTIAL_WITH_PAYOUT, pending: false });

    const chip = await screen.findByRole('button', { name: 'Claim 1.25 DOT' });
    expect(chip).toBeEnabled();
  });
});
