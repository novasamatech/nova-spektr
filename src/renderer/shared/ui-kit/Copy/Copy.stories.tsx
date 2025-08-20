import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Button } from '@/shared/ui';

import { Copy } from './Copy';

const meta: Meta<typeof Copy> = {
  title: 'Design System/kit/Copy',
  component: Copy,
  render: args => (
    <div className="flex items-center gap-2">
      <span>Hello, world!</span>
      <Copy {...args}>
        <Button size="sm">Copy Text</Button>
      </Copy>
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof Copy>;

export const Default: Story = {
  args: {
    value: 'Hello, world!',
  },
};
