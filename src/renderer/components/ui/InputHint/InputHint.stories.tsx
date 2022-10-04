import { ComponentMeta, ComponentStory } from '@storybook/react';

import InputHint from './InputHint';

export default {
  title: 'InputHint',
  component: InputHint,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InputHint>;

const Template: ComponentStory<typeof InputHint> = (args) => <InputHint {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  type: 'hint',
  children: 'Test hint text',
};

export const Error = Template.bind({});
Error.args = {
  type: 'error',
  children: 'Test error text',
};
