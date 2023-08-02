import { Meta, StoryFn } from '@storybook/react';

import AccountAddress from './AccountAddress';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';

export default {
  title: 'Redesign/Address',
  component: AccountAddress,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof AccountAddress>;

const Template: StoryFn<typeof AccountAddress> = (args) => <AccountAddress {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNT_ID,
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNT_ID,
  type: 'full',
};
