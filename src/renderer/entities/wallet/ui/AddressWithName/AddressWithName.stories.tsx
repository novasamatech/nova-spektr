import { ComponentStory, ComponentMeta } from '@storybook/react';

import { AddressWithName } from './AddressWithName';
import { TEST_ACCOUNT_ID } from '@shared/lib/utils';

export default {
  title: 'AddressWithName',
  component: AddressWithName,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof AddressWithName>;

const Template: ComponentStory<typeof AddressWithName> = (args) => <AddressWithName {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNT_ID,
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNT_ID,
  type: 'full',
};
