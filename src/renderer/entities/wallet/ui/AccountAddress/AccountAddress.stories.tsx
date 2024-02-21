import { ComponentStory, ComponentMeta } from '@storybook/react';

import { AccountAddress } from './AccountAddress';
import { TEST_ACCOUNTS } from '@shared/lib/utils';

export default {
  title: 'Redesign/Address',
  component: AccountAddress,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof AccountAddress>;

const Template: ComponentStory<typeof AccountAddress> = (args) => <AccountAddress {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNTS[0],
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNTS[0],
  type: 'full',
};
