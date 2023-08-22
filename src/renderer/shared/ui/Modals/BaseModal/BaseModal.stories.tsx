import type { Meta, StoryObj } from '@storybook/react';

import { BaseModal } from './BaseModal';

const meta: Meta<typeof BaseModal> = {
  title: 'ui/Base Modal',
  component: BaseModal,
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
