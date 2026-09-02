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
  claimableNum: 100,
  lockedNum: 100,
  ...overrides,
});

/** A row whose only lock is a delegation, signed by the account itself. */
const delegating = (overrides: Partial<GovernanceLockRow> = {}): GovernanceLockRow =>
  row({
    claimable: BN_ZERO,
    claimableActions: [],
    delegated: new BN(100),
    delegations: [{ trackId: '20', target: lockedId, balance: new BN(100), conviction: 'None' }],
    undelegateActions: [
      { type: 'undelegate', trackId: '20' },
      { type: 'unlock', trackId: '20' },
    ],
    undelegateInitiator: signer,
    undelegateBlockReason: null,
    ...overrides,
  });

const renderCell = (lockRow: GovernanceLockRow, chainConnected = true, onUnlock = vi.fn(), onUndelegate = vi.fn()) => {
  render(
    <I18Provider>
      <ThemeProvider>
        <LockActionCell row={lockRow} chainConnected={chainConnected} onUnlock={onUnlock} onUndelegate={onUndelegate} />
      </ThemeProvider>
    </I18Provider>,
  );

  return { onUnlock, onUndelegate };
};

const unlockButton = () => screen.queryByRole('button', { name: 'Unlock' });
const undelegateButton = () => screen.queryByRole('button', { name: 'Undelegate' });

describe('features/dashboard-governance/ui/LockActionCell', () => {
  it('says nothing is claimable while the lock is still held by a vote', () => {
    renderCell(row({ claimable: BN_ZERO, claimableActions: [], pending: new BN(100) }));

    expect(screen.getByText('Nothing claimable')).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
    expect(undelegateButton()).toBeNull();
  });

  it('offers Undelegate alone for a delegation-only row', () => {
    const { onUndelegate } = renderCell(delegating());

    expect(unlockButton()).toBeNull();
    expect(screen.queryByText('No unlock date')).toBeNull();
    expect(undelegateButton()).toBeEnabled();
    // The caption counts the tracks the revoke covers.
    expect(screen.getByText('1 track')).toBeInTheDocument();
    fireEvent.click(undelegateButton()!);
    expect(onUndelegate).toHaveBeenCalledWith(expect.objectContaining({ accountId: lockedId }));
  });

  it('stacks Undelegate under the Unlock verdict when both apply', () => {
    renderCell(delegating({ claimable: new BN(100), claimableActions: [{ type: 'unlock', trackId: '0' }] }));

    expect(unlockButton()).toBeEnabled();
    expect(undelegateButton()).toBeEnabled();
    // Release first, revoke second — the order the design stacks them in.
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((label) => label === 'Unlock' || label === 'Undelegate'),
    ).toEqual(['Unlock', 'Undelegate']);
  });

  it('disables Undelegate when the key never signs', () => {
    const { onUndelegate } = renderCell(delegating({ undelegateInitiator: null, undelegateBlockReason: 'watch-only' }));

    expect(undelegateButton()).toBeDisabled();
    fireEvent.click(undelegateButton()!);
    expect(onUndelegate).not.toHaveBeenCalled();
  });

  it('names the reason a disabled Undelegate cannot be signed', () => {
    renderCell(delegating({ undelegateInitiator: null, undelegateBlockReason: 'watch-only' }));

    // A disabled button cannot be hovered or focused, so its wrapper carries the reason.
    expect(undelegateButton()?.parentElement).toHaveAttribute(
      'aria-label',
      'Undelegate must be signed by the delegator and you hold no key for this address',
    );
  });

  it('disables Undelegate while the chain is disconnected', () => {
    renderCell(delegating(), false);

    expect(undelegateButton()).toBeDisabled();
  });

  it('warns that a multisig undelegate only opens a pending operation', () => {
    renderCell(delegating({ undelegateInitiator: multisig }));

    expect(undelegateButton()).toBeEnabled();
    expect(screen.getByText('Needs signatories')).toBeInTheDocument();
  });

  it('shows Watch-only instead of a button when a remove_vote needs a key nobody holds', () => {
    renderCell(row({ initiator: null, wallet: null, blockReason: 'watch-only' }));

    expect(screen.getByText('Watch-only')).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
  });

  it('releases through the button for a self-signed row', () => {
    const { onUnlock } = renderCell(row());
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
    const { onUnlock } = renderCell(row({ initiator: null, wallet: null, blockReason: 'no-signer' }));
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
