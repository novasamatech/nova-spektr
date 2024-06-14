import { ComponentMeta, ComponentStory } from '@storybook/react';

import { ChainTitle } from './ChainTitle';
import { TEST_CHAIN_ID } from '@shared/lib/utils';

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
