import { type Meta, type StoryObj } from '@storybook/react';

import { createBaseAccount, polkadotChain } from '@/shared/mocks';

import { RankedAccount } from './RankedAccount';

const account = createBaseAccount('1');

const meta: Meta<typeof RankedAccount> = {
  title: 'Design System/entities/RankedAccount',
  component: RankedAccount,
  args: {
    chain: polkadotChain,
  },
};

export default meta;

type Story = StoryObj<typeof RankedAccount>;

export const Default: Story = {
  args: {
    name: account.name,
    rank: 3,
    isActive: true,
    accountId: account.accountId,
  },
};

export const Disabled: Story = {
  args: {
    rank: 0,
    isActive: false,
    accountId: account.accountId,
  },
};
