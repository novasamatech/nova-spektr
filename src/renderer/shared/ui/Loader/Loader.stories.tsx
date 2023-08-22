import type { Meta, StoryObj } from '@storybook/react';

import { Loader } from './Loader';

const meta: Meta<typeof Loader> = {
  title: 'ui/Loader ',
  component: Loader,

  decorators: [
    (Story) => (
      <div className="mt-28 mx-auto w-[200px] bg-gray-200 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Primary: Story = {
  args: {
    size: 32,
    color: 'primary',
  },
};

export const White: Story = {
  args: {
    size: 32,
    color: 'white',
  },
};
