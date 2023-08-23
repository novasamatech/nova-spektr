import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Popover } from './Popover';

const meta: Meta<typeof Popover> = {
  title: 'Design system/Popover ',
  component: Popover,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const OnHover: Story = {
  args: {
    content: 'Staking will automatically start when the next era starts',
    contentClass: 'p-2',
    children: <button className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</button>,
  },
};
