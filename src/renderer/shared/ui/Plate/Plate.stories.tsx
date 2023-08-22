import type { Meta, StoryObj } from '@storybook/react';

import { Plate } from './Plate';

const meta: Meta<typeof Plate> = {
  title: 'Plate',
  component: Plate,
};

export default meta;
type Story = StoryObj<typeof Plate>;

export const Primary: Story = {
  args: {
    children: 'This is simple content',
  },
};
