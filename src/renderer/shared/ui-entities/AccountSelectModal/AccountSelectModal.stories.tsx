import { BN_MILLION } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { AccountType, type Asset, type BaseAccount, type Chain, ChainType, CryptoType } from '@/shared/core';
import { TEST_ACCOUNTS } from '../../lib/utils';

import { AccountSelectModal } from './AccountSelectModal';

const testAsset: Asset = {
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/assets/white/Polkadot_(DOT).svg',
  name: 'Polkadot',
};

const testChain: Chain = {
  name: 'Polkadot',
  specName: 'polkadot',
  addressPrefix: 0,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Polkadot.svg',
  nodes: [],
  assets: [testAsset],
};

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
    chain: testChain,
    asset: testAsset,
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
