import { ComponentMeta, ComponentStory } from '@storybook/react';

import I18Provider from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import Amount from './Amount';

export default {
  title: 'Amount',
  component: Amount,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <I18Provider>
        <Story />
      </I18Provider>
    ),
  ],
} as ComponentMeta<typeof Amount>;

const Template: ComponentStory<typeof Amount> = (args) => <Amount {...args} />;

const asset = {
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  icon: 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/icons/chains/white/Polkadot.svg',
} as Asset;

export const Primary = Template.bind({});
Primary.args = {
  value: '15.22',
  balance: '20500000000',
  asset,
};

export const TwoValues = Template.bind({});
TwoValues.args = {
  value: '15.22',
  balance: ['20500000000', '51700000000'],
  asset,
};
