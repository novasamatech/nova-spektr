import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from './Icon';

export default {
  title: 'Icon',
  component: Icon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Icon>;

const Template: ComponentStory<typeof Icon> = (args) => <Icon {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  as: 'img',
  size: 40,
  name: 'settings',
};
