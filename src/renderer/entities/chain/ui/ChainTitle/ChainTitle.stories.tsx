import { type Meta, type StoryFn } from '@storybook/react';

import { TEST_CHAIN_ID } from '@/shared/lib/utils';

import { ChainTitle } from './ChainTitle';

export default {
  title: 'Chain',
  component: ChainTitle,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof ChainTitle>;

const Template: StoryFn<typeof ChainTitle> = (args) => <ChainTitle {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  chainId: TEST_CHAIN_ID,
};
