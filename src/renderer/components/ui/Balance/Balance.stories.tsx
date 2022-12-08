import { ComponentStory, ComponentMeta } from '@storybook/react';

import Balance from './Balance';

export default {
  title: 'Balance',
  component: Balance,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Balance>;

const Template: ComponentStory<typeof Balance> = (args) => <Balance {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  value: '10000000000000000000',
  precision: 10,
};

export const WithSymbol = Template.bind({});
WithSymbol.args = {
  value: '10000000000000000000',
  precision: 10,
  symbol: 'KSM',
};
