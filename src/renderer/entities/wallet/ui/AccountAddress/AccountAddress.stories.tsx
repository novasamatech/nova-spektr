import { ComponentStory, ComponentMeta } from '@storybook/react';

import { AccountAddress } from './AccountAddress';
import { TEST_ACCOUNT_ID } from '@shared/lib/utils';

export default {
  title: 'Redesign/Address',
  component: AccountAddress,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof AccountAddress>;

const Template: ComponentStory<typeof AccountAddress> = (args) => <AccountAddress {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNT_ID,
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNT_ID,
  type: 'full',
};
