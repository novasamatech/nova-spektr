import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'ui/Checkbox',
  component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Primary: Story = {
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

export const Disabled: Story = {
  args: {
    children: 'Checkbox',
    disabled: true,
  },
};
