import { type Meta, type StoryObj } from '@storybook/react';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Design System/kit/Checkbox',
  component: Checkbox,
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    children: 'Checkbox',
  },
};

export const Left: Story = {
  args: {
    position: 'left',
    children: 'Checkbox',
  },
};
