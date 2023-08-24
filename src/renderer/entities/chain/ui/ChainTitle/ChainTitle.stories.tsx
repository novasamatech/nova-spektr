import { ComponentMeta, ComponentStory } from '@storybook/react';

import { ChainTitle } from './ChainTitle';
import { TEST_CHAIN_ID } from '@renderer/shared/lib/utils';

export default {
  title: 'Redesign/Chain',
  component: ChainTitle,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof ChainTitle>;

const Template: ComponentStory<typeof ChainTitle> = (args: any) => <ChainTitle {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  chainId: TEST_CHAIN_ID,
};
