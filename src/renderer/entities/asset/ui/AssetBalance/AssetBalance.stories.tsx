import { type Meta, type StoryFn } from '@storybook/react';

import { AssetBalance } from './AssetBalance';

export default {
  title: 'v1/entities/Token balance',
  component: AssetBalance,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof AssetBalance>;

const assetDot = {
  assetId: 3,
  symbol: 'DOT',
  precision: 10,
  priceId: 'polkadot',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-utils/master/icons/chains/white/Polkadot.svg',
  name: 'Polkadot',
};

const Template: StoryFn<typeof AssetBalance> = (args) => <AssetBalance {...args} />;

export const Default = Template.bind({});
Default.args = {
  asset: assetDot,
  value: '10000000',
  showIcon: true,
};
