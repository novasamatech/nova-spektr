import { type Meta, type StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';

import { Button, Switch } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Popover } from './Popover';

const meta: Meta<typeof Popover> = {
  component: Popover,
  title: 'Design System/kit/Popover',
  parameters: {
    layout: 'centered',
  },
  render: params => {
    return (
      <Popover {...params}>
        <Popover.Trigger>
          <Button>Open popover</Button>
        </Popover.Trigger>
        <Popover.Content>
          <Box padding={4}>Some content</Box>
        </Popover.Content>
      </Popover>
    );
  },
};

export default meta;

type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = await canvas.findByTestId('Button');
    await userEvent.click(button);
    const popover = await canvas.findByTestId('Popover');
    expect(popover).toBeTruthy();
  },
};

export const Controlled: Story = {
  decorators: [
    (Story, { args }) => {
      const [open, onToggle] = useState(false);

      return (
        <Box gap={4}>
          <Switch checked={open} onChange={onToggle}>
            Toggle popover
          </Switch>
          <Story args={{ ...args, open, onToggle }} />
        </Box>
      );
    },
  ],
};
