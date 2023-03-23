import { ComponentMeta, ComponentStory } from '@storybook/react';

import InputArea from './InputArea';

export default {
  title: 'InputArea',
  component: InputArea,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof InputArea>;

const Template: ComponentStory<typeof InputArea> = (args) => <InputArea {...args} />;

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

export const Label = Template.bind({});
Label.args = {
  rows: 1,
  label: 'With label',
  value: 'This is value',
};

export const Invalid = Template.bind({});
Invalid.args = {
  rows: 1,
  label: 'With invalid',
  value: 'This is value',
  invalid: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  rows: 1,
  label: 'With disabled label',
  value: 'This is value',
  disabled: true,
};
