import type { Meta, StoryObj } from '@storybook/react';

import { Shimmering } from './Shimmering';

const meta: Meta<typeof Shimmering> = {
  title: 'Shimmering',
  component: Shimmering,
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
