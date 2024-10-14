import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button, Switch } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Design System/kit/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render(args) {
    return (
      <Tooltip {...args}>
        <Tooltip.Trigger>
          <Button>Open</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint text.</Tooltip.Content>
      </Tooltip>
    );
  },
};

export const LargeContent: Story = {
  render(args) {
    return (
      <Tooltip {...args}>
        <Tooltip.Trigger>
          <Button>Open</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          This is a great example of a hint text in four lines of 30-40 characters each. The maximum size of the
          tooltip.
        </Tooltip.Content>
      </Tooltip>
    );
  },
};

export const Controllable: Story = {
  decorators: [
    (Story, { args }) => {
      const [open, onToggle] = useState(false);

      return (
        <Box gap={4}>
          <Story args={{ ...args, open, onToggle }} />
          <Switch checked={open} onChange={onToggle}>
            Toggle tooltip
          </Switch>
        </Box>
      );
    },
  ],
  render(args) {
    return (
      <Tooltip {...args}>
        <Tooltip.Trigger>
          <Button>Open</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          This is a great example of a hint text in four lines of 30-40 characters each. The maximum size of the
          tooltip.
        </Tooltip.Content>
      </Tooltip>
    );
  },
};
