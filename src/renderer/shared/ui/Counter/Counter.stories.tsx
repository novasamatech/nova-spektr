import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Counter } from './Counter';

const meta: Meta<typeof Counter> = {
  title: 'Design system/Counter',
  component: Counter,
  decorators: [withVersion('1.0.0')],
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
