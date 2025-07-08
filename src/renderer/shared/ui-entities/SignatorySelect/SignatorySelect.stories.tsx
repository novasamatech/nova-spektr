import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { createPolkadotWallet, createVaultBaseAccount, dotAsset, polkadotChain } from '@/shared/mocks';

import { SignatorySelect } from './SignatorySelect';

const signatories = [
  { signer: createVaultBaseAccount('1', { walletId: 1 }), balance: '100000000000' },
  { signer: createVaultBaseAccount('2', { walletId: 1 }), balance: '50000000000' },
  { signer: createVaultBaseAccount('3', { walletId: 2 }), balance: '10000000000' },
];

const allAccounts = signatories.map(({ signer }) => signer);

const allWallets = [
  createPolkadotWallet(1, { rootAccountId: signatories[0]!.signer.accountId }),
  createPolkadotWallet(2, { rootAccountId: signatories[2]!.signer.accountId }),
];

const network = { chain: polkadotChain, asset: dotAsset } as const;

const meta: Meta<typeof SignatorySelect> = {
  title: 'Design System/entities/SignatorySelector',
  component: SignatorySelect,
  args: {
    signatories,
    signatory: signatories[0]?.signer ?? null,
    hasError: false,
    errorText: '',
    onChange: fn(),
    network,
    allAccounts,
    initiator: signatories[0]?.signer ?? null,
    allWallets,
  },
};

export default meta;

type Story = StoryObj<typeof SignatorySelect>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    hasError: true,
    errorText: 'Select signatory',
  },
};
