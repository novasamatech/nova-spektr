import type { Meta, StoryObj } from '@storybook/react';

import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Switch',
  component: Switch,

  decorators: [
    (Story) => (
      <div className="w-max">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Primary: Story = {
  args: {
    children: 'Switch label',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Switch label',
    disabled: true,
  },
};
