import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { ConfirmModal } from './ConfirmModal';

const meta: Meta<typeof ConfirmModal> = {
  title: 'Design system/ConfirmModal',
  component: ConfirmModal,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

export const Playground: Story = {
  args: {
    isOpen: true,
    children: <h2>Children content</h2>,
    onClose: () => {},
  },
};
