import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { StatusMark } from './StatusMark';

const meta: Meta<typeof StatusMark> = {
  title: 'Design system/StatusMark',
  component: StatusMark,
  decorators: [withVersion('1.0.0')],
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
