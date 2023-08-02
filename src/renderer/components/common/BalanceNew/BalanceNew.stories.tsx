import { Meta, StoryFn } from '@storybook/react';

import BalanceNew from './BalanceNew';

export default {
  title: 'Redesign/Token balance',
  component: BalanceNew,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof BalanceNew>;

const assetDot = {
  assetId: 3,
  symbol: 'DOT',
  precision: 10,
  priceId: 'polkadot',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-utils/master/icons/chains/white/Polkadot.svg',
  name: 'Polkadot',
};

const Template: StoryFn<typeof BalanceNew> = (args) => <BalanceNew {...args} />;

export const Default = Template.bind({});
Default.args = {
  asset: assetDot,
  value: '10000000',
  showIcon: true,
};
