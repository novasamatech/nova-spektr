import { ComponentStory, ComponentMeta } from '@storybook/react';

import Switch from './Switch';

export default {
  title: 'Switch',
  component: Switch,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <div className="w-max">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = (args) => <Switch {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Switch label',
};

export const Disabled = Template.bind({});
Disabled.args = {
  children: 'Switch label',
  disabled: true,
};
