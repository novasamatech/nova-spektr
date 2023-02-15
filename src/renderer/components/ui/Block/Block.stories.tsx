import { ComponentStory, ComponentMeta } from '@storybook/react';

import Block from './Block';

export default {
  title: 'Block',
  component: Block,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Block>;

const Template: ComponentStory<typeof Block> = (args) => <Block {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
