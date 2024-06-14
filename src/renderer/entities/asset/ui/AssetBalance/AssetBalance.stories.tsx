import { ComponentMeta, ComponentStory } from '@storybook/react';

import { AssetBalance } from './AssetBalance';

export default {
  title: 'Token balance',
  component: AssetBalance,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof AssetBalance>;

const assetDot = {
  assetId: 3,
  symbol: 'DOT',
  precision: 10,
  priceId: 'polkadot',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-utils/master/icons/chains/white/Polkadot.svg',
  name: 'Polkadot',
};

const Template: ComponentStory<typeof AssetBalance> = (args) => <AssetBalance {...args} />;

export const Default = Template.bind({});
Default.args = {
  asset: assetDot,
  value: '10000000',
  showIcon: true,
};
