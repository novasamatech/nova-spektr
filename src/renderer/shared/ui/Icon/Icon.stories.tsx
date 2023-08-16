import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Icon } from './Icon';

export default {
  title: 'Icon',
  component: Icon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Icon>;

const Template: ComponentStory<typeof Icon> = (args) => <Icon {...args} />;

export const Image = Template.bind({});
Image.args = {
  as: 'img',
  size: 16,
  name: 'learn-more',
};

export const Svg = Template.bind({});
Image.args = {
  as: 'svg',
  size: 32,
  name: 'upload-file',
  className: 'hover:text-red-500',
};
