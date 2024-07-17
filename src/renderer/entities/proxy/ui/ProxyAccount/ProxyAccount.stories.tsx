import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { TEST_ACCOUNTS } from '@shared/lib/utils';
import { ProxyAccount } from './ProxyAccount';
import { ProxyType } from '@shared/core';

export default {
  title: 'ProxyAccount',
  component: ProxyAccount,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ProxyAccount>;

const Template: ComponentStory<typeof ProxyAccount> = (args) => <ProxyAccount {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNTS[0],
  proxyType: ProxyType.STAKING,
};

export const WithName = Template.bind({});
WithName.args = {
  accountId: TEST_ACCOUNTS[0],
  proxyType: ProxyType.ANY,
  name: 'Some account',
  type: 'full',
};
