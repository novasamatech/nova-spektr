import { ComponentMeta, ComponentStory } from '@storybook/react';

import { PasswordInput } from './PasswordInput';

export default {
  title: 'Password Input',
  component: PasswordInput,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof PasswordInput>;

const Template: ComponentStory<typeof PasswordInput> = (args) => <PasswordInput {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Test input',
};
