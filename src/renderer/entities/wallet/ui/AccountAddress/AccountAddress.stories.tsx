import { type Meta, type StoryFn } from '@storybook/react';

import { TEST_ACCOUNTS } from '@shared/lib/utils';

import { AccountAddress } from './AccountAddress';

export default {
  title: 'Address',
  component: AccountAddress,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof AccountAddress>;

const Template: StoryFn<typeof AccountAddress> = (args) => <AccountAddress {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNTS[0],
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNTS[0],
  type: 'full',
};
