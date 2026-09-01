import { BN, BN_ZERO } from '@polkadot/util';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type MultisigAccount, type Wallet, AccountType, SigningType, WalletType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { ThemeProvider } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { type GovernanceLockRow } from '../lib/buildLockRows';

import { LockActionCell } from './LockActionCell';

const lockedId = createAccountId('locked');
const payerId = createAccountId('payer');

const wallet: Wallet = { id: 1, name: 'Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };

const signer: AnyAccount = {
  id: 'signer',
  type: 'universal',
  name: '',
  walletId: wallet.id,
  accountId: lockedId,
  cryptoType: 0,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const payer: AnyAccount = { ...signer, id: 'payer', accountId: payerId };

const multisig: MultisigAccount = {
  id: 'multisig',
  type: 'universal',
  name: '',
  walletId: 2,
  accountId: lockedId,
  accountType: AccountType.MULTISIG,
  cryptoType: 0,
  signingType: SigningType.MULTISIG,
  threshold: 2,
  signatories: [],
  createdAt: 0,
};

/** A releasable row signed by the locked account itself. */
const row = (overrides: Partial<GovernanceLockRow> = {}): GovernanceLockRow => ({
  key: 'row',
  accountId: lockedId,
  chainId: polkadotChainId,
  chain: polkadotChain,
  chainName: 'Polkadot',
  chainIcon: '',
  symbol: 'DOT',
  precision: 10,
  wallet,
  locked: new BN(100),
  lockedFiat: null,
  claimable: new BN(100),
  claimableFiat: null,
  claimableActions: [{ type: 'unlock', trackId: '0' }],
  pending: BN_ZERO,
  nextUnlockAtMs: null,
  daysUntilNextUnlock: null,
  delegated: BN_ZERO,
  delegatedFiat: null,
  tracks: ['0'],
  initiator: signer,
  target: lockedId,
  blockReason: null,
  claimableNum: 100,
  lockedNum: 100,
  ...overrides,
});

const renderCell = (lockRow: GovernanceLockRow, chainConnected = true, onUnlock = vi.fn()) => {
  render(
    <I18Provider>
      <ThemeProvider>
        <LockActionCell row={lockRow} chainConnected={chainConnected} onUnlock={onUnlock} />
      </ThemeProvider>
    </I18Provider>,
  );

  return onUnlock;
};

const unlockButton = () => screen.queryByRole('button', { name: 'Unlock' });

describe('features/dashboard-governance/ui/LockActionCell', () => {
  it('says nothing is claimable while the lock is still held by a vote', () => {
    renderCell(row({ claimable: BN_ZERO, claimableActions: [], pending: new BN(100) }));

    expect(screen.getByText('Nothing claimable')).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
  });

  it('says there is no unlock date for a purely delegated lock', () => {
    renderCell(row({ claimable: BN_ZERO, claimableActions: [], delegated: new BN(100) }));

    expect(screen.getByText('No unlock date')).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
  });

  it('shows Watch-only instead of a button when a remove_vote needs a key nobody holds', () => {
    renderCell(row({ initiator: null, wallet: null, blockReason: 'watch-only' }));

    expect(screen.getByText('Watch-only')).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
  });

  it('releases through the button for a self-signed row', () => {
    const onUnlock = renderCell(row());
    const button = unlockButton();

    expect(button).toBeEnabled();
    fireEvent.click(button!);

    expect(onUnlock).toHaveBeenCalledWith(expect.objectContaining({ accountId: lockedId }));
    // The caption says how much comes back — 100 planck of a 10-decimal token is dust.
    expect(screen.getByText('<0.0001 DOT')).toBeInTheDocument();
    expect(screen.queryByText('Needs signatories')).toBeNull();
    expect(screen.queryByText('permissionless')).toBeNull();
  });

  it('shows the released amount under the button for a readable claim', () => {
    renderCell(row({ claimable: new BN('12500000000') }));

    expect(screen.getByText('1.25 DOT')).toBeInTheDocument();
  });

  it('warns that a multisig release only opens a pending operation', () => {
    renderCell(row({ initiator: multisig }));

    expect(unlockButton()).toBeEnabled();
    expect(screen.getByText('Needs signatories')).toBeInTheDocument();
  });

  it('marks a release paid by another local account as permissionless', () => {
    renderCell(row({ initiator: payer }));

    expect(unlockButton()).toBeEnabled();
    expect(screen.getByText('permissionless')).toBeInTheDocument();
  });

  it('keeps the tooltip reachable by keyboard when the button is disabled', () => {
    renderCell(row({ initiator: null, wallet: null, blockReason: 'no-signer' }));

    // A disabled button cannot take focus, so its wrapper does.
    expect(unlockButton()?.parentElement).toHaveAttribute('tabindex', '0');
  });

  it('disables the button, without a caption, when nothing local can sign', () => {
    const onUnlock = renderCell(row({ initiator: null, wallet: null, blockReason: 'no-signer' }));
    const button = unlockButton();

    expect(button).toBeDisabled();
    fireEvent.click(button!);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.queryByText('permissionless')).toBeNull();
  });

  it('disables the button while the chain is disconnected', () => {
    renderCell(row(), false);

    expect(unlockButton()).toBeDisabled();
  });
});
