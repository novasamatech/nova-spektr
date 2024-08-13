import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Icon } from '@shared/ui';

import { Input } from './Input';

export default {
  title: 'Input',
  component: Input,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Input>;

const Template: ComponentStory<typeof Input> = (args) => <Input {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Test input',
};

export const Filled = Template.bind({});
Filled.args = {
  value: 'This is value',
};

export const Label = Template.bind({});
Label.args = {
  label: 'With label',
  value: 'This is value',
};

export const Invalid = Template.bind({});
Invalid.args = {
  label: 'With invalid',
  value: 'This is value',
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'With disabled label',
  value: 'This is value',
  disabled: true,
};

export const Suffix = Template.bind({});
Suffix.args = {
  label: 'With suffix element',
  value: 'This is value',
  suffixElement: <Icon name="warnCutout" className="absolute right-2 top-[9px] text-alert" size={16} />,
};
