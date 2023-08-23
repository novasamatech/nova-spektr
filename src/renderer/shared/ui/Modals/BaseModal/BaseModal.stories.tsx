import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { BaseModal } from './BaseModal';

const meta: Meta<typeof BaseModal> = {
  title: 'Design system/BaseModal',
  component: BaseModal,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof BaseModal>;

export const Primary: Story = {
  args: {
    title: 'Base modal',
    isOpen: true,
    children: (
      <p className="flex flex-col gap-8 p-4">
        <p>webpack building... 99% done plugins webpack-hot-middleware</p>
        <p>webpack built preview in 2605ms</p>
        <p>webpack building... 99% done plugins webpack-hot-middleware</p>
      </p>
    ),
    closeButton: true,
    onClose: () => {},
  },
};
