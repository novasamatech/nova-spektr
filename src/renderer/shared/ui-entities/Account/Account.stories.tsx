import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';

import { Account } from './Account';

const meta: Meta<typeof Account> = {
  title: 'Design System/entities/Account',
  component: Account,
  args: {
    accountId: TEST_ACCOUNTS[0],
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
