import { ComponentMeta, ComponentStory } from '@storybook/react';

import { TEST_ACCOUNT_ID } from '@shared/lib/utils';
import { ProxyAccount } from './ProxyAccount';
import { ProxyType } from '@entities/proxy';

export default {
  title: 'ProxyAccount',
  component: ProxyAccount,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ProxyAccount>;

const Template: ComponentStory<typeof ProxyAccount> = (args) => <ProxyAccount {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNT_ID,
  proxyType: ProxyType.Staking,
};

export const WithName = Template.bind({});
WithName.args = {
  accountId: TEST_ACCOUNT_ID,
  proxyType: ProxyType.Any,
  name: 'Some account',
  type: 'full',
};
