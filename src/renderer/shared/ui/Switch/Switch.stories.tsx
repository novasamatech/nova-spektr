import { type Meta, type StoryFn } from '@storybook/react';

import { Switch } from './Switch';

export default {
  title: 'v1/ui/Switch',
  component: Switch,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="w-max">
        <Story />
      </div>
    ),
  ],
} as Meta<typeof Switch>;

const Template: StoryFn<typeof Switch> = (args) => <Switch {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Switch label',
};

export const Disabled = Template.bind({});
Disabled.args = {
  children: 'Switch label',
  disabled: true,
};
