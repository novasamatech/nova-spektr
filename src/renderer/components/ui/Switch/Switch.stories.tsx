import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Switch } from '@renderer/components/ui';

export default {
  title: 'Switch',
  component: Switch,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = (args) => <Switch {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  label: 'Switch lable',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Switch label',
  disabled: true,
};
