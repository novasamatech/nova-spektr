import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { TEST_CHAIN_ID } from '@shared/lib/utils';

import { ChainTitle } from './ChainTitle';

export default {
  title: 'Chain',
  component: ChainTitle,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ChainTitle>;

const Template: ComponentStory<typeof ChainTitle> = (args) => <ChainTitle {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  chainId: TEST_CHAIN_ID,
};
