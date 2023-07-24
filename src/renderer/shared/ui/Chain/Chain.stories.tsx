import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Chain } from './Chain';
import { TEST_CHAIN_ID } from '@renderer/shared/lib/utils';

export default {
  title: 'Redesign/Chain',
  component: Chain,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Chain>;

const Template: ComponentStory<typeof Chain> = (args) => <Chain {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  chainId: TEST_CHAIN_ID,
};
