import type { Meta, StoryObj } from '@storybook/react';

import { ConfirmModal } from './ConfirmModal';

const meta: Meta<typeof ConfirmModal> = {
  title: 'ConfirmModal',
  component: ConfirmModal,
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

export const Primary: Story = {
  args: {
    isOpen: true,
    children: <h2>Children content</h2>,
    onClose: () => {},
  },
};
