import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '@/shared/ui-kit';

import { WalletCard } from './WalletCard';

const meta: Meta<typeof WalletCard> = {
  title: 'Design System/entities/WalletCard',
  component: WalletCard,
  decorators: [
    Story => (
      <Box width="400px">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WalletCard>;

export const Default: Story = {
  args: {
    title: 'My Wallet',
    description: "Hi! I'm wallet card/button for creation flow",
    iconName: 'novaWalletOnboarding',
  },
};

export const Disabled: Story = {
  args: {
    title: 'My Wallet',
    description: "Hi! I'm wallet card/button for creation flow",
    iconName: 'novaWalletOnboarding',
    disabled: true,
  },
};

export const LargeDescription: Story = {
  args: {
    title: 'My Wallet',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et',
    iconName: 'ledgerOnboarding',
  },
};
