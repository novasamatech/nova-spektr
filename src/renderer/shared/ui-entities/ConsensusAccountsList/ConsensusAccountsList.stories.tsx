import { type Meta, type StoryObj } from '@storybook/react-vite';

import { createAccountId, kusamaChain, polkadotAssetHubChain, polkadotChain } from '@/shared/mocks';

import { ConsensusAccountsList } from './ConsensusAccountsList';

const meta: Meta<typeof ConsensusAccountsList> = {
  title: 'Design System/entities/ConsensusAccountsList',
  component: ConsensusAccountsList,
};

export default meta;

type Story = StoryObj<typeof ConsensusAccountsList>;

export const Default: Story = {
  args: {
    accounts: [
      [polkadotChain, createAccountId()],
      [kusamaChain, createAccountId()],
      [polkadotAssetHubChain, createAccountId()],
    ],
  },
  decorators: [
    Story => {
      return (
        <div className="w-[552px]">
          <Story />
        </div>
      );
    },
  ],
};
