import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Asset } from '@renderer/domain/asset';
import Amount from './Amount';

export default {
  title: 'Amount',
  component: Amount,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Amount>;

const Template: ComponentStory<typeof Amount> = (args) => <Amount {...args} />;

const asset = {
  assetId: 0,
  name: 'Polkadot',
  symbol: 'DOT',
  precision: 10,
  icon: 'Polkadot.svg',
} as Asset;

export const Primary = Template.bind({});
Primary.args = {
  name: 'amount',
  value: '15.22',
  balance: '20500000000',
  asset,
};
