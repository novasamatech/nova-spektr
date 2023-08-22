import type { Meta, StoryObj } from '@storybook/react';

import { ButtonText } from './ButtonText';

const meta: Meta<typeof ButtonText> = {
  title: 'ui/Buttons/ButtonText',
  component: ButtonText,
};

export default meta;
type Story = StoryObj<typeof ButtonText>;

export const Primary: Story = {
  args: {
    children: 'Hello button',
  },
};

export const Prefix: Story = {
  args: {
    children: 'Hello button',
    disabled: false,
    icon: 'address-book',
  },
};
