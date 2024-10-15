import { type Meta, type StoryFn } from '@storybook/react';

import { Separator } from './Separator';

export default {
  title: 'Separator',
  component: Separator,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Separator>;

const Template: StoryFn<typeof Separator> = (args) => <Separator {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Hello world',
};
