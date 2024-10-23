import { type Meta, type StoryFn } from '@storybook/react';

import { PasswordInput } from './PasswordInput';

export default {
  title: 'v1/ui/Password Input',
  component: PasswordInput,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof PasswordInput>;

const Template: StoryFn<typeof PasswordInput> = (args) => <PasswordInput {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  placeholder: 'Test input',
};
