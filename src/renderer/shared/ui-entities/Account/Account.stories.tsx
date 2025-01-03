import { type Meta, type StoryObj } from '@storybook/react';

import { createBaseAccount, polkadotChain } from '@/shared/mocks';

import { Account } from './Account';

const meta: Meta<typeof Account> = {
  title: 'Design System/entities/Account',
  component: Account,
  args: {
    accountId: createBaseAccount().accountId,
    chain: polkadotChain,
  },
};

export default meta;

type Story = StoryObj<typeof Account>;

export const Default: Story = {
  decorators: [
    Story => {
      return (
        <div className="w-96 resize-x overflow-hidden">
          <Story />
        </div>
      );
    },
  ],
};

export const WithTitle: Story = {
  args: {
    title: 'Account with name',
  },
};

export const Short: Story = {
  args: {
    variant: 'short',
  },
};
