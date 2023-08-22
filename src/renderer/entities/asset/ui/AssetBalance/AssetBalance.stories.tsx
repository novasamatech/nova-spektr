import type { Meta, StoryObj } from '@storybook/react';

import { AssetBalance } from './AssetBalance';

const meta: Meta<typeof AssetBalance> = {
  title: 'Redesign/Token balance',
  component: AssetBalance,
};

const assetDot = {
  assetId: 3,
  symbol: 'DOT',
  precision: 10,
  priceId: 'polkadot',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-utils/master/icons/chains/white/Polkadot.svg',
  name: 'Polkadot',
};

export default meta;
type Story = StoryObj<typeof AssetBalance>;

export const Default: Story = {
  args: {
    asset: assetDot,
    value: '10000000',
    showIcon: true,
  },
};
