import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Shimmering } from './Shimmering';

const meta: Meta<typeof Shimmering> = {
  title: 'Design system/Shimmering',
  component: Shimmering,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Shimmering>;

export const Primary: Story = {
  args: {
    width: 200,
    height: 40,
  },
};

export const Height: Story = {
  args: {
    height: 40,
  },
};
