import { type Meta, type StoryFn } from '@storybook/react';

import { InputArea } from './InputArea';

export default {
  title: 'v1/ui/InputArea',
  component: InputArea,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof InputArea>;

const Template: StoryFn<typeof InputArea> = (args) => <InputArea {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  rows: 3,
  maxLength: 120,
  placeholder: 'Max length is 120',
};

export const Filled = Template.bind({});
Filled.args = {
  rows: 2,
  value:
    'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Culpa doloribus iusto possimus praesentium ratione temporibus. Aperiam autem cumque esse eum fugit laborum quas! Architecto at, cupiditate dignissimos eveniet sunt voluptatibus.',
};

export const Invalid = Template.bind({});
Invalid.args = {
  rows: 1,
  value: 'This is value',
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  rows: 1,
  value: 'This is value',
  disabled: true,
};
