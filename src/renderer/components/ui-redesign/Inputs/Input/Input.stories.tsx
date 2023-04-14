import { ComponentMeta, ComponentStory } from '@storybook/react';

import Input from './Input';

export default {
  title: 'Redesign/Input',
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
