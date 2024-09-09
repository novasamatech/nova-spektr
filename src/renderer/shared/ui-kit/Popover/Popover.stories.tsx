import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button, Switch } from '../../ui';
import { Box } from '../Box/Box';

import { Popover } from './Popover';

const meta: Meta<typeof Popover> = {
  component: Popover,
  title: 'Popover',
  parameters: {
    layout: 'centered',
  },
  render: (params) => {
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

export const Default: Story = {};

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
