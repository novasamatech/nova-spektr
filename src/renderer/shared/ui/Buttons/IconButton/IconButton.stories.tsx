import { type Meta, type StoryFn } from '@storybook/react';

import { IconButton } from './IconButton';

export default {
  title: 'v1/ui/Icon Button',
  component: IconButton,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof IconButton>;

const Template: StoryFn<typeof IconButton> = (args) => <IconButton {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  name: 'settingsLite',
};
