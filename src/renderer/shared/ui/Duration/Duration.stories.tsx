import type { Meta, StoryObj } from '@storybook/react';

import { Duration } from './Duration';

const meta: Meta<typeof Duration> = {
  title: 'Duration',
  component: Duration,
};

export default meta;
type Story = StoryObj<typeof Duration>;

export const Primary: Story = {
  args: {
    seconds: '1',
  },
};
