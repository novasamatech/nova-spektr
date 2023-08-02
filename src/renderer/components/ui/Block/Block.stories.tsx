import { StoryFn, Meta } from '@storybook/react';

import Block from './Block';

export default {
  title: 'Block',
  component: Block,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Block>;

const Template: StoryFn<typeof Block> = (args) => <Block {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'This is simple content',
};
