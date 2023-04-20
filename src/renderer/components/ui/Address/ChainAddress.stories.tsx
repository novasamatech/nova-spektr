import { ComponentStory, ComponentMeta } from '@storybook/react';

import ChainAddress from './ChainAddress';
import { TEST_ACCOUNT_ID } from '@renderer/shared/utils/constants';

export default {
  title: 'Address',
  component: ChainAddress,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ChainAddress>;

const Template: ComponentStory<typeof ChainAddress> = (args) => <ChainAddress {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  accountId: TEST_ACCOUNT_ID,
};

export const Full = Template.bind({});
Full.args = {
  accountId: TEST_ACCOUNT_ID,
  type: 'full',
};
