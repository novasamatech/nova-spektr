import { type Meta, type StoryObj } from '@storybook/react-vite';

import { kusamaChain, polkadotChain } from '@/shared/mocks';

import { ChainIcon } from './ChainIcon';

const meta: Meta<typeof ChainIcon> = {
  title: 'Design System/entities/ChainIcon',
  component: ChainIcon,
  args: {
    chain: polkadotChain,
  },
  argTypes: {
    chain: {
      table: {
        defaultValue: { summary: 'polkadot' },
      },
      options: ['polkadot', 'kusama'],
      mapping: {
        polkadot: polkadotChain,
        kusama: kusamaChain,
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ChainIcon>;

export const Default: Story = {};
export const CustomSize: Story = {
  args: {
    size: 32,
  },
};
