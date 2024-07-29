import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { TEST_ACCOUNTS } from '@shared/lib/utils';

import { AddressWithName } from './AddressWithName';

export default {
  title: 'AddressWithName',
  component: AddressWithName,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof AddressWithName>;

const Template: ComponentStory<typeof AddressWithName> = (args) => <AddressWithName {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNTS[0],
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNTS[0],
  type: 'full',
};
