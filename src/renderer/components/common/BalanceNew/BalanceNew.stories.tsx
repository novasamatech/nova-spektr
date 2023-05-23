import { ComponentMeta, ComponentStory } from '@storybook/react';

import BalanceNew from './BalanceNew';

export default {
  title: 'Redesign/Token balance',
  component: BalanceNew,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof BalanceNew>;

const assetDot = {
  assetId: 3,
  symbol: 'DOT',
  precision: 10,
  priceId: 'polkadot',
  icon: 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/icons/chains/white/Polkadot.svg',
  name: 'Polkadot',
};

const Template: ComponentStory<typeof BalanceNew> = (args) => <BalanceNew {...args} />;

export const Default = Template.bind({});
Default.args = {
  asset: assetDot,
  value: '10000000',
  showIcon: true,
};
