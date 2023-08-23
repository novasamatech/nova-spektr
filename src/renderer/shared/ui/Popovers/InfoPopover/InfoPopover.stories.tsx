import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InfoPopover } from './InfoPopover';
import { popoverItems } from './InfoPopover.test';

const meta: Meta<typeof InfoPopover> = {
  title: 'Design system/InfoPopover',
  component: InfoPopover,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InfoPopover>;

export const Primary: Story = {
  args: {
    data: popoverItems,
    children: <button>click me</button>,
  },
};
