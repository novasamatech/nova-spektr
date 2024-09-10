import { type Meta, type StoryFn } from '@storybook/react';

import { Checkbox } from './Checkbox';

export default {
  title: 'Checkbox',
  component: Checkbox,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof Checkbox>;

const Template: StoryFn<typeof Checkbox> = (args) => <Checkbox {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Checkbox',
};

export const Left = Template.bind({});
Left.args = {
  position: 'left',
  children: 'Checkbox',
};

export const Disabled = Template.bind({});
Disabled.args = {
  children: 'Checkbox',
  disabled: true,
};
