import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Duration } from './Duration';

const meta: Meta<typeof Duration> = {
  title: 'Design system/Duration',
  component: Duration,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Duration>;

export const Primary: Story = {
  args: {
    seconds: '1',
  },
};
