import { BN_MILLION } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { AccountType, type BaseAccount, ChainType, CryptoType } from '@/shared/core';
import { dotAsset, polkadotChain } from '@/shared/mocks';
import { TEST_ACCOUNTS } from '../../lib/utils';

import { AccountSelectModal } from './AccountSelectModal';

const accounts = TEST_ACCOUNTS.map<BaseAccount>((accountId, index) => ({
  id: index,
  accountId,
  chainType: ChainType.SUBSTRATE,
  cryptoType: CryptoType.SR25519,
  name: `Test Account ${index + 1}`,
  type: AccountType.BASE,
  walletId: 1,
}));

const meta: Meta<typeof AccountSelectModal> = {
  title: 'Design System/entities/AccountSelectModal',
  component: AccountSelectModal,
  args: {
    isOpen: true,
    title: 'Select test account',
    chain: polkadotChain,
    asset: dotAsset,
    onToggle: fn(),
    onSelect: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof AccountSelectModal>;

export const Default: Story = {
  args: {
    options: accounts.map((account) => ({
      account,
    })),
  },
};

export const WithBalances: Story = {
  args: {
    options: accounts.map((account, index) => ({
      account,
      balance: BN_MILLION.muln(Math.pow(10, index + 1)),
    })),
  },
};

export const WithTitles: Story = {
  args: {
    options: accounts.map((account, index) => ({
      account,
      title: `Account name ${index + 1}`,
    })),
  },
};

export const CloseButton: Story = {
  args: {
    closeButton: true,
    options: accounts.map((account) => ({ account })),
  },
};

export const AllCombined: Story = {
  args: {
    options: accounts.map((account, index) => ({
      account,
      title: `Account name ${index + 1}`,
      balance: BN_MILLION.muln(Math.pow(10, index + 1)),
    })),
  },
};
