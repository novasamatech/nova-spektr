import type { Meta, StoryObj } from '@storybook/react';

import { Popover } from './Popover';

const meta: Meta<typeof Popover> = {
  title: 'ui/Popover ',
  component: Popover,
  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-max">
        <Story />
      </div>
    ),
  ],
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
