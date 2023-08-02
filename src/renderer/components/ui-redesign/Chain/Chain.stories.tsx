import { Meta, StoryFn } from '@storybook/react';

import { Chain } from './Chain';
import { TEST_CHAIN_ID } from '@renderer/shared/utils/constants';

export default {
  title: 'Redesign/Chain',
  component: Chain,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Chain>;

const Template: StoryFn<typeof Chain> = (args) => <Chain {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  chainId: TEST_CHAIN_ID,
};
