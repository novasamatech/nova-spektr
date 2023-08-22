import type { Meta, StoryObj } from '@storybook/react';

import { InfoPopover } from './InfoPopover';
import { popoverItems } from './InfoPopover.test';

const meta: Meta<typeof InfoPopover> = {
  title: 'ui/Info Popover',
  component: InfoPopover,
};

export default meta;
type Story = StoryObj<typeof InfoPopover>;

export const Primary: Story = {
  args: {
    data: popoverItems,
    children: <button>click me</button>,
  },
};
