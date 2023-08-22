import type { Meta, StoryObj } from '@storybook/react';

import { ButtonIcon } from './ButtonIcon';

const meta: Meta<typeof ButtonIcon> = {
  title: 'ui/Buttons/ButtonIcon',
  component: ButtonIcon,
};

export default meta;
type Story = StoryObj<typeof ButtonIcon>;

export const Background: Story = {
  args: {
    icon: 'close',
    size: 'sm',
    background: true,
  },
};

export const NoBackground: Story = {
  args: {
    icon: 'close',
    size: 'sm',
    background: false,
  },
};
