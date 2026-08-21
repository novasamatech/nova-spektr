import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  accountsStore: Symbol('accounts'),
  accounts: [] as unknown[],
  /** Account ids the chain-availability check rejects for the rendered chain. */
  unavailableOnChain: [] as string[],
  isAccountAvailableOnChain: (account: { accountId: string }) =>
    !testState.unavailableOnChain.includes(account.accountId),
}));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => (store === testState.accountsStore ? testState.accounts : undefined),
}));

vi.mock('@/shared/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

// Chain availability leans on DI registrations that a unit test has no business booting.
vi.mock('@/domains/network/account/service', () => ({
  accountService: { isAccountAvailableOnChain: testState.isAccountAvailableOnChain },
}));

// The real service decides who may still act — only the surrounding stores are faked.
vi.mock('@/domains/network', async () => {
  const service = await vi.importActual('@/domains/network/multisig-operation/service');

  return {
    multisigOperationService: (service as { multisigOperationService: unknown }).multisigOperationService,
    accountService: { isAccountAvailableOnChain: testState.isAccountAvailableOnChain },
    accounts: { $list: testState.accountsStore },
    isContactMultisigAccount: () => false,
  };
});

vi.mock('@/entities/network', () => ({ useNetworkData: () => ({ api: { name: 'api' }, chain: { name: 'chain' } }) }));

// Only the depositor (Reject) check still goes through `accountUtils`; signatory
// ownership is decided by the real service above, against the real `SigningType`.
vi.mock('@/entities/wallet', async () => {
  const { SigningType } = await import('@/shared/core');

  return {
    accountUtils: {
      isWatchOnlyAccount: (account: { signingType: string }) => account.signingType === SigningType.WATCH_ONLY,
    },
  };
});

vi.mock('@/features/wallet-pairing', () => ({ WalletPairingOperationTrigger: () => <div>pair-wallet</div> }));

vi.mock('./modals/ApproveTx', () => ({ ApproveTxModal: ({ children }: { children: unknown }) => children as never }));
vi.mock('./modals/RejectTx', () => ({ RejectTxModal: ({ children }: { children: unknown }) => children as never }));
vi.mock('./modals/CallDataModal', () => ({
  CallDataModal: ({ children }: { children: unknown }) => children as never,
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ children }: { children: unknown }) => <button>{children as never}</button>,
  FootnoteText: ({ children }: { children: unknown }) => <span>{children as never}</span>,
  Icon: () => null,
  Loader: () => null,
}));

vi.mock('@/shared/ui-kit', () => ({
  Tooltip: Object.assign(({ children }: { children: unknown }) => children as never, {
    Trigger: ({ children }: { children: unknown }) => children as never,
    Content: () => null,
  }),
}));

import { SigningType } from '@/shared/core';

import { OperationActions } from './OperationActions';

const SIGNATORIES = ['sig-1', 'sig-2', 'sig-3'];

const makeAccount = (accountId: string) => ({ accountId, walletId: 1, signingType: 'key' });

const makeOperation = (approvedBy: string[]) => ({
  id: 'op-1',
  chainId: '0x01',
  callHash: '0xhash',
  callData: undefined,
  depositor: 'sig-2',
  status: 'pending',
  awaitingOutcome: false,
  events: approvedBy.map((accountId, index) => ({
    id: `event-${index}`,
    accountId,
    status: 'approve',
    blockCreated: 1,
    indexCreated: index,
    timestamp: 0,
  })),
});

const multisigAccount = {
  accountId: 'multisig',
  walletId: 2,
  threshold: 3,
  signatories: SIGNATORIES.map(accountId => ({ accountId })),
};

const renderActions = (approvedBy: string[], account: object = multisigAccount) =>
  render(<OperationActions operation={makeOperation(approvedBy) as never} account={account as never} />);

describe('OperationActions', () => {
  beforeEach(() => {
    testState.accounts = [makeAccount('sig-1')];
    testState.unavailableOnChain = [];
  });

  it('offers Approve while an own signatory has not signed', () => {
    renderActions(['sig-2']);

    expect(screen.getByText('operation.approveButton')).toBeInTheDocument();
    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
  });

  it('shows the Signed state once every own signatory has approved', () => {
    renderActions(['sig-1']);

    expect(screen.getByText('operation.signedButton')).toBeInTheDocument();
    expect(screen.getByLabelText('operation.signedTooltip')).toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
  });

  it('waits for the remaining own signatory before calling the operation signed', () => {
    testState.accounts = [makeAccount('sig-1'), makeAccount('sig-3')];
    renderActions(['sig-1']);

    expect(screen.getByText('operation.approveButton')).toBeInTheDocument();
    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
  });

  it('stays empty when the user owns none of the signatories', () => {
    testState.accounts = [makeAccount('someone-else')];
    renderActions(['sig-1']);

    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
    expect(screen.queryByText('operation.rejectButton')).not.toBeInTheDocument();
  });

  it('ignores a watch-only account holding the signatory', () => {
    testState.accounts = [{ ...makeAccount('sig-1'), signingType: SigningType.WATCH_ONLY }];
    renderActions(['sig-1']);

    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
  });

  it('shows Signed when the only other own key is not available on this chain', () => {
    // sig-3 is held, but not on this chain — the service offers nothing to approve
    // with, so the cell must say Signed rather than stay blank.
    testState.accounts = [makeAccount('sig-1'), makeAccount('sig-3')];
    testState.unavailableOnChain = ['sig-3'];
    renderActions(['sig-1']);

    expect(screen.getByText('operation.signedButton')).toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
  });

  it('asks for call data instead of Approve or Signed at the final signing without call data', () => {
    // Threshold 2, one approval in: the next signature executes and needs the
    // call data. The user still holds an unsigned key (sig-3), so the action is
    // "Add call data" — not Approve, and certainly not Signed.
    testState.accounts = [makeAccount('sig-1'), makeAccount('sig-3')];
    renderActions(['sig-1'], { ...multisigAccount, threshold: 2 });

    expect(screen.getByText('operation.callData.addCallDataButton')).toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
  });

  it('shows both Reject and Signed when the depositor has signed with all own accounts', () => {
    // makeOperation's depositor is 'sig-2' — owning it (local, non-watch-only,
    // on-chain) makes Reject available; being the only own signatory and having
    // already approved makes the Signed pill appear too.
    testState.accounts = [makeAccount('sig-2')];
    renderActions(['sig-2']);

    expect(screen.getByText('operation.rejectButton')).toBeInTheDocument();
    expect(screen.getByText('operation.signedButton')).toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
  });
});
