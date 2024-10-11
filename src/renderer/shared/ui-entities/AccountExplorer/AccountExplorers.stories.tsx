import { type Meta, type StoryObj } from '@storybook/react';

import { polkadotChain } from '@/shared/mocks';

import { AccountExplorers } from './AccountExplorers';

const testAccountId = '0xd180LUV5yfqBC9i8Lfssufw2434ef24f3f7AhBDDcaHEF03a8';

const meta: Meta<typeof AccountExplorers> = {
  title: 'Design System/entities/AccountExplorers',
  component: AccountExplorers,
  args: {
    account: testAccountId,
    chain: polkadotChain,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof AccountExplorers>;

export const Default: Story = {};

export const WithAdditionalContent: Story = {
  args: {
    children: <p className="text-text-secondary">Derivation path: //polkadot//pub</p>,
  },
};
