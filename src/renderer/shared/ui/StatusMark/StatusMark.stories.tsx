import type { Meta, StoryObj } from '@storybook/react';

import { StatusMark } from './StatusMark';

const meta: Meta<typeof StatusMark> = {
  title: 'ui/StatusMark',
  component: StatusMark,
};

export default meta;
type Story = StoryObj<typeof StatusMark>;
export const Waiting: Story = {
  args: {
    title: '@user_name:matrix.org',
    variant: 'waiting',
  },
};

export const Success: Story = {
  args: {
    title: '@user_name:matrix.org',
    subtitle: 'Session verified',
    variant: 'success',
  },
};
