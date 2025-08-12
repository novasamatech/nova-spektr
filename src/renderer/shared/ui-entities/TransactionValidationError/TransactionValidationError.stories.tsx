import { BN_MILLION, BN_THOUSAND } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { createWcWallet, dotAsset, kusamaAsset } from '@/shared/mocks';
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

export const Permission: Story = {
  args: {
    errors: [
      {
        type: 'permission',
        wallet: createWcWallet(0, []),
        permission: 'transfer',
      },
    ],
  },
};

export const Balance: Story = {
  args: {
    errors: [
      {
        type: 'balance',
        wallet: createWcWallet(0, []),
        withdrawals: [
          {
            balance: BN_THOUSAND,
            action: 'fee',
            asset: dotAsset,
          },
        ],
      },
    ],
  },
};

export const Multiple: Story = {
  args: {
    errors: [
      {
        type: 'permission',
        wallet: createWcWallet(0, []),
        permission: 'transfer',
      },
      {
        type: 'balance',
        wallet: createWcWallet(0, []),
        withdrawals: [
          {
            balance: BN_MILLION,
            action: 'fee',
            asset: dotAsset,
          },
          {
            balance: BN_MILLION,
            action: 'multisig deposit',
            asset: kusamaAsset,
          },
        ],
      },
    ],
  },
};
