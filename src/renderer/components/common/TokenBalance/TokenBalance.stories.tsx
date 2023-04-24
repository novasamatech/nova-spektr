import { ComponentMeta, ComponentStory } from '@storybook/react';

import TokenBalance from './TokenBalance';

export default {
  title: 'Redesign/Token balance',
  component: TokenBalance,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof TokenBalance>;

const assetDot = {
  assetId: 3,
  symbol: 'DOT',
  precision: 10,
  priceId: 'polkadot',
  icon: 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/icons/chains/white/Polkadot.svg',
  name: 'Polkadot',
};

const Template: ComponentStory<typeof TokenBalance> = (args) => <TokenBalance {...args} />;

export const Default = Template.bind({});
Default.args = {
  asset: assetDot,
  value: '10000000',
};
