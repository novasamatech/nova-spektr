import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  accountsStore: Symbol('accounts'),
  accounts: [] as unknown[],
}));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => (store === testState.accountsStore ? testState.accounts : undefined),
}));

vi.mock('@/shared/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

// Chain availability leans on DI registrations that a unit test has no business booting.
vi.mock('@/domains/network/account/service', () => ({
  accountService: { isAccountAvailableOnChain: () => true },
}));

// The real service decides who may still act — only the surrounding stores are faked.
vi.mock('@/domains/network', async () => {
  const service = await vi.importActual('@/domains/network/multisig-operation/service');

  return {
    multisigOperationService: (service as { multisigOperationService: unknown }).multisigOperationService,
    accountService: { isAccountAvailableOnChain: () => true },
    accounts: { $list: testState.accountsStore },
    isContactMultisigAccount: () => false,
  };
});

vi.mock('@/entities/network', () => ({ useNetworkData: () => ({ api: { name: 'api' }, chain: { name: 'chain' } }) }));

vi.mock('@/entities/wallet', () => ({
  accountUtils: { isWatchOnlyAccount: (account: { signingType: string }) => account.signingType === 'watch_only' },
}));

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

const renderActions = (approvedBy: string[]) =>
  render(<OperationActions operation={makeOperation(approvedBy) as any} account={multisigAccount as any} />);

describe('OperationActions', () => {
  beforeEach(() => {
    testState.accounts = [makeAccount('sig-1')];
  });

  it('offers Approve while an own signatory has not signed', () => {
    renderActions(['sig-2']);

    expect(screen.getByText('operation.approveButton')).toBeInTheDocument();
    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
  });

  it('shows the Signed state once every own signatory has approved', () => {
    renderActions(['sig-1']);

    expect(screen.getByText('operation.signedButton')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
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
    testState.accounts = [{ ...makeAccount('sig-1'), signingType: 'watch_only' }];
    renderActions(['sig-1']);

    expect(screen.queryByText('operation.signedButton')).not.toBeInTheDocument();
    expect(screen.queryByText('operation.approveButton')).not.toBeInTheDocument();
  });
});
