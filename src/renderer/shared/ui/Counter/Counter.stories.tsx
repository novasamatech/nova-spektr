import type { Meta, StoryObj } from '@storybook/react';

import { Counter } from './Counter';

const meta: Meta<typeof Counter> = {
  title: 'ui/Counter',
  component: Counter,
};

export default meta;
type Story = StoryObj<typeof Counter>;
export const Waiting: Story = {
  args: {
    variant: 'waiting',
    children: 5,
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: '21',
  },
};
