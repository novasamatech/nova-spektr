import { ComponentMeta, ComponentStory } from '@storybook/react';

import Input from './Input';

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
