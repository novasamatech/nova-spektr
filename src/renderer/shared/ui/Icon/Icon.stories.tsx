import { type Meta, type StoryFn } from '@storybook/react';

import { Icon } from './Icon';

export default {
  title: 'v1/ui/Icon',
  component: Icon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Icon>;

const Template: StoryFn<typeof Icon> = (args) => <Icon {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  size: 40,
  name: 'settings',
};
