import { ComponentStory, ComponentMeta } from '@storybook/react';

import Checkbox from './Checkbox';

export default {
  title: 'Checkbox',
  component: Checkbox,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Checkbox>;

const Template: ComponentStory<typeof Checkbox> = (args) => <Checkbox {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  label: 'Checkbox',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Checkbox',
  disabled: true,
};
