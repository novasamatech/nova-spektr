import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Design system/Tooltip ',
  component: Tooltip,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'Staking will automatically start when the next era starts',
    contentClass: 'p-2',
    children: <p className="py-2 px-3 bg-gray-200 w-40 text-center">Hover me</p>,
  },
};
