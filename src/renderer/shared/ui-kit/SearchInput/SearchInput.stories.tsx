import { type Meta, type StoryFn } from '@storybook/react';

import { SearchInput } from './SearchInput';

export default {
  title: 'Design System/kit/SearchInput',
  component: SearchInput,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof SearchInput>;

const Template: StoryFn<typeof SearchInput> = (args) => <SearchInput {...args} />;

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
