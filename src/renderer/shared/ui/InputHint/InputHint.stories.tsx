import { type Meta, type StoryFn } from '@storybook/react';

import { InputHint } from './InputHint';

export default {
  title: 'v1/ui/Input Hint',
  component: InputHint,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof InputHint>;

const Template: StoryFn<typeof InputHint> = (args) => <InputHint {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  active: true,
  variant: 'hint',
  children: 'Test hint text',
};

// export const Error = Template.bind({});
// Error.args = {
//   active: true,
//   variant: 'error',
//   children: 'Test error text',
// };
