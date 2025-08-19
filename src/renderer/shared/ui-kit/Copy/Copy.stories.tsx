import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Button } from '@/shared/ui';

import { Copy } from './Copy';

const meta: Meta<typeof Copy> = {
  title: 'Design System/kit/Copy',
  component: Copy,
};

export default meta;

type Story = StoryObj<typeof Copy>;

export const Default: Story = {
  args: {
    value: 'Hello, world!',
  },
  render: args => (
    <div className="flex items-center gap-2">
      <span>Hello, world!</span>
      <Copy {...args}>
        <Button size="sm">Copy Text</Button>
      </Copy>
    </div>
  ),
};

export const WithOnCopiedCallback: Story = {
  args: {
    value: '5FYxhVJjGsUxutYmaaWtm76Jhb4FNsu4yvC4prm5yDmLPozN',
  },
  render: args => {
    return (
      <div className="flex items-center gap-2">
        <span>5FYxhVJjGsUxutYmaaWtm76Jhb4FNsu4yvC4prm5yDmLPozN</span>
        <Copy {...args}>
          <span className="text-blue-600 underline">Copy Address</span>
        </Copy>
      </div>
    );
  },
};
