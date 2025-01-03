import { type Meta, type StoryObj } from '@storybook/react';

import { createAccountId, kusamaChain, polkadotChain } from '@/shared/mocks';

import { ChainAccountsList } from './ChainAccountsList';

const meta: Meta<typeof ChainAccountsList> = {
  title: 'Design System/entities/ChainAccountsList',
  component: ChainAccountsList,
};

export default meta;

type Story = StoryObj<typeof ChainAccountsList>;

export const Default: Story = {
  args: {
    accounts: [
      [polkadotChain, createAccountId()],
      [kusamaChain, createAccountId()],
    ],
  },
  decorators: [
    Story => {
      return (
        <div className="w-[400px]">
          <Story />
        </div>
      );
    },
  ],
};
