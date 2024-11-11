import { type Meta, type StoryFn } from '@storybook/react';

import { TextArea } from './TextArea';

export default {
  title: 'Design System/kit/TextArea',
  component: TextArea,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof TextArea>;

const Template: StoryFn<typeof TextArea> = (args) => <TextArea {...args} />;

const LONG_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Culpa doloribus iusto possimus praesentium ratione temporibus. Aperiam autem cumque esse eum fugit laborum quas! Architecto at, cupiditate dignissimos eveniet sunt voluptatibus.';

export const Primary = Template.bind({});
Primary.args = {
  rows: 3,
  maxLength: 120,
  placeholder: 'Max length is 120',
};

export const Filled = Template.bind({});
Filled.args = {
  rows: 2,
  value: LONG_TEXT,
};

export const Invalid = Template.bind({});
Invalid.args = {
  rows: 1,
  value: LONG_TEXT,
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  rows: 1,
  value: LONG_TEXT,
  disabled: true,
};
