import { BN_MILLION, BN_THOUSAND } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Balance as BalanceType } from '@/shared/core';
import { createWcAccount, createWcWallet, dotAsset, kusamaAsset } from '@/shared/mocks';
import { Box } from '@/shared/ui-kit';

import { TransactionValidationError } from './TransactionValidationError';

const meta: Meta<typeof TransactionValidationError> = {
  title: 'Design System/entities/TransactionValidationError',
  component: TransactionValidationError,
  decorators: [
    Story => (
      <Box width="400px">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TransactionValidationError>;

const account = createWcAccount('test', 0);
const wallet = createWcWallet(0, [account]);

export const Permission: Story = {
  args: {
    wallets: [wallet],
    errors: [
      {
        account,
        permission: 'transfer',
      },
    ],
  },
};

export const Balance: Story = {
  args: {
    wallets: [wallet],
    errors: [
      {
        account,
        balance: {
          success: false,
          balance: {} as BalanceType,
          required: BN_THOUSAND,
          imbalance: BN_THOUSAND,
        },
        action: 'fee',
        asset: dotAsset,
      },
    ],
  },
};

export const Multiple: Story = {
  args: {
    wallets: [wallet],
    errors: [
      {
        account,
        permission: 'transfer',
      },
      {
        account,
        balance: {
          success: false,
          balance: {} as BalanceType,
          required: BN_MILLION,
          imbalance: BN_MILLION,
        },
        action: 'fee',
        asset: dotAsset,
      },
      // second fee, should be merged with previous one
      {
        account,
        balance: {
          success: false,
          balance: {} as BalanceType,
          required: BN_MILLION,
          imbalance: BN_MILLION,
        },
        action: 'fee',
        asset: dotAsset,
      },
      // third fee, should be separated because of different asset
      {
        account,
        balance: {
          success: false,
          balance: {} as BalanceType,
          required: BN_MILLION,
          imbalance: BN_MILLION,
        },
        action: 'fee',
        asset: kusamaAsset,
      },
      {
        account,
        balance: {
          success: false,
          balance: {} as BalanceType,
          required: BN_MILLION,
          imbalance: BN_MILLION,
        },
        action: 'multisig deposit',
        asset: kusamaAsset,
      },
    ],
  },
};
