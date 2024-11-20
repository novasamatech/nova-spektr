import { type Meta, type StoryFn } from '@storybook/react';

import { Icon } from '@/shared/ui';

import { Input } from './Input';

export default {
  title: 'Design System/kit/Input',
  component: Input,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Input>;

const Template: StoryFn<typeof Input> = (args) => <Input {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Test input',
};

export const Filled = Template.bind({});
Filled.args = {
  value: 'This is value',
};

export const Invalid = Template.bind({});
Invalid.args = {
  value: 'This is value',
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  value: 'This is value',
  disabled: true,
};

export const Prefix = Template.bind({});
Prefix.args = {
  value: 'This is value',
  prefixElement: <Icon name="search" className="text-text-secondary" size={16} />,
};

export const Suffix = Template.bind({});
Suffix.args = {
  value: 'This is value',
  suffixElement: <Icon name="warnCutout" className="text-alert" size={16} />,
};
