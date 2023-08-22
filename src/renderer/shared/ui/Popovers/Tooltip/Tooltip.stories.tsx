import type { Meta, StoryObj } from '@storybook/react';

import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'ui/Tooltip ',
  component: Tooltip,

  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
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
