import { ComponentMeta, ComponentStory } from '@storybook/react';

import { SigningType } from '@renderer/domain/shared-kernel';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';
import AddressOnPlate from './AddressOnPlate';

export default {
  title: 'AddressOnPlate',
  component: AddressOnPlate,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof AddressOnPlate>;

const Template: ComponentStory<typeof AddressOnPlate> = (args) => <AddressOnPlate {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNT_ID,
  name: 'My account',
  title: 'Plate title',
};

export const WithSignType = Template.bind({});
WithSignType.args = {
  accountId: TEST_ACCOUNT_ID,
  name: 'My account',
  subName: 'Wallet #1',
  title: 'Plate title',
  signType: SigningType.WATCH_ONLY,
};
