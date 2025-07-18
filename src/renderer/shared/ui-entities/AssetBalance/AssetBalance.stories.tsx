import { BN } from '@polkadot/util';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Asset } from '@/shared/core';

import { AssetBalance } from './AssetBalance';

const meta: Meta<typeof AssetBalance> = {
  title: 'Design System/entities/AssetBalance',
  component: AssetBalance,
  args: {
    asset: {
      symbol: 'DOT',
      precision: 2,
    } as unknown as Asset,
  },
};

export default meta;

type Story = StoryObj<typeof AssetBalance>;

export const Default: Story = {
  args: {
    value: new BN('2500000'),
  },
};

export const WithSuffix: Story = {
  args: {
    value: new BN('250000000'),
  },
};
