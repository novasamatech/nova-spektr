import { type Meta, type StoryFn } from '@storybook/react';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';

import { ProxyAccount } from './ProxyAccount';

export default {
  title: 'v1/entities/ProxyAccount',
  component: ProxyAccount,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof ProxyAccount>;

const Template: StoryFn<typeof ProxyAccount> = (args) => <ProxyAccount {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNTS[0],
  proxyType: 'Staking',
};

export const WithName = Template.bind({});
WithName.args = {
  accountId: TEST_ACCOUNTS[0],
  proxyType: 'Any',
  name: 'Some account',
  type: 'full',
};
