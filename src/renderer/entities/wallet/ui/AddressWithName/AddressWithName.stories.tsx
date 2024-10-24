import { type Meta, type StoryFn } from '@storybook/react';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';

import { AddressWithName } from './AddressWithName';

export default {
  title: 'v1/entities/AddressWithName',
  component: AddressWithName,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof AddressWithName>;

const Template: StoryFn<typeof AddressWithName> = (args) => <AddressWithName {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNTS[0],
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNTS[0],
  type: 'full',
};
