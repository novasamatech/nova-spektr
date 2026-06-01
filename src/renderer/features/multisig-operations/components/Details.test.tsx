import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';

import { Details } from './Details';

const stores = vi.hoisted(() => ({
  walletsStore: Symbol('wallets'),
  chainsStore: Symbol('chains'),
}));

vi.mock('effector-react', () => ({
  useStoreMap: () => ({}),
  useUnit: (store: symbol) => {
    if (store === stores.walletsStore) return testWallets;
    if (store === stores.chainsStore) return {};
    return undefined;
  },
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'operation.details.signerAccount') return 'Signer Account';
      if (key === 'transfer.signatoryLabel') return 'Signatory';
      return key;
    },
  }),
}));

vi.mock('@/shared/ui', () => ({
  CaptionText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  DetailRow: ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  ),
  FootnoteText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Icon: () => null,
}));

vi.mock('@/shared/ui-entities', () => ({
  AccountExplorers: () => null,
  AssetBalance: () => null,
  WalletIcon: () => null,
}));

vi.mock('@/shared/ui-kit', () => ({
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Skeleton: () => null,
}));

vi.mock('@/domains/network', () => ({
  identity: { $list: null },
}));

vi.mock('@/domains/staking', () => ({
  useActiveEra: () => ({ data: null }),
  useValidators: () => ({ data: {} }),
}));

vi.mock('@/entities/network', () => ({
  networkModel: { $chains: stores.chainsStore },
}));

vi.mock('@/entities/chain', () => ({
  ChainTitle: () => null,
}));

vi.mock('@/entities/governance', () => ({
  TracksDetails: () => null,
  voteTransactionService: {
    getAccountVote: () => null,
    getConviction: () => null,
  },
}));

vi.mock('@/entities/operations', () => ({
  operationDetailsUtils: {
    getDelegate: () => null,
    getDelegationTarget: () => null,
    getDelegationTracks: () => [],
    getDelegationVotes: () => null,
    getDestination: () => null,
    getDestinationAccountId: () => null,
    getDestinationChain: () => null,
    getPayee: () => undefined,
    getProxyType: () => null,
    getReferendumId: () => null,
    getSpawner: () => null,
    getUndelegationData: () => Promise.resolve({ votes: undefined, target: undefined }),
    getVote: () => null,
  },
}));

vi.mock('@/entities/staking', () => ({
  SelectedValidatorsModal: () => null,
}));

vi.mock('@/entities/transaction', () => ({
  isAddProxyTransaction: () => false,
  isManageProxyTransaction: () => false,
  isProxyTransaction: () => false,
  isRemoveProxyTransaction: () => false,
  isRemovePureProxyTransaction: () => false,
  isTransferTransaction: () => false,
  isUndelegateTransaction: () => false,
  isXcmTransaction: () => false,
}));

vi.mock('@/entities/wallet', () => ({
  walletModel: { $wallets: stores.walletsStore },
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ title, accountId }: { title?: string; accountId: AccountId }) => <span>{title ?? accountId}</span>,
  WalletName: ({ wallet }: { wallet: Wallet }) => <span>{wallet.name}</span>,
}));

const signerAccountId = '0x01' as AccountId;
const signerWalletId = 1;
const testWallets = [
  {
    id: signerWalletId,
    name: 'Signer Wallet',
    accounts: [],
    type: 'polkadot_vault',
  },
] as unknown as Wallet[];

const chain = {
  chainId: '0x00',
  assets: [],
} as unknown as Chain;

const operation = {
  id: 'operation-id',
  chainId: chain.chainId,
  transaction: null,
} as unknown as MultisigOperation;

const signer = {
  id: 'signer-account',
  name: 'Alice Signer',
  walletId: signerWalletId,
  accountId: signerAccountId,
} as unknown as AnyAccount;

describe('Details', () => {
  it('shows signer account instead of signer wallet for multisig operation signatory', () => {
    render(<Details api={{} as never} operation={operation} chain={chain} signatory={signer} />);

    expect(screen.getByText('Signer Account')).toBeInTheDocument();
    expect(screen.getByText('Alice Signer')).toBeInTheDocument();
    expect(screen.queryByText('Signer Wallet')).not.toBeInTheDocument();
  });
});
