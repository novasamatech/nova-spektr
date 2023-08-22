import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'ui/Buttons/Button',
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    pallet: 'primary',
    children: 'Hello button',
  },
};

export const Prefix: Story = {
  args: {
    pallet: 'primary',
    children: 'Hello button',
    disabled: false,
    icon: 'address-book',
  },
};
