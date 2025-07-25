import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';
import { Label } from '../Label/Label';

import { ConfirmModal } from './ConfirmModal';

const exampleTitle = 'Title';
const exampleDescription = 'Description';
const exampleCancelText = 'Cancel';
const exampleConfirmText = 'Confirm';

const meta: Meta<typeof ConfirmModal> = {
  title: 'Design System/kit/ConfirmModal',
  component: ConfirmModal,
  args: {
    title: exampleTitle,
    description: exampleDescription,
    cancelText: exampleCancelText,
    confirmText: exampleConfirmText,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof ConfirmModal>;

export const Default: Story = {
  render(args) {
    return (
      <ConfirmModal {...args}>
        <ConfirmModal.Trigger>
          <Button>Toggle Confirm Modal</Button>
        </ConfirmModal.Trigger>
      </ConfirmModal>
    );
  },
  decorators: [
    (Story, { args }) => {
      return <Story args={{ ...args }} />;
    },
  ],
};

export const Controlled: Story = {
  decorators: [
    (Story, { args }) => {
      const [isOpen, onToggle] = useState(false);

      return (
        <Box gap={30}>
          <Label variant="purple">External toggle state: {isOpen.toString()}</Label>
          <Button onClick={() => onToggle(x => !x)}>Toggle Confirm Modal</Button>
          <Story args={{ ...args, isOpen, onToggle }} />
        </Box>
      );
    },
  ],
  render(args) {
    return <ConfirmModal {...args} />;
  },
};

export const Alert: Story = {
  render(args) {
    return (
      <ConfirmModal {...args}>
        <ConfirmModal.Trigger>
          <Button>Toggle Confirm Modal</Button>
        </ConfirmModal.Trigger>
      </ConfirmModal>
    );
  },
  decorators: [
    (Story, { args }) => {
      return <Story args={{ ...args, type: 'alert' }} />;
    },
  ],
};

export const Warning: Story = {
  render(args) {
    return (
      <ConfirmModal {...args}>
        <ConfirmModal.Trigger>
          <Button>Toggle Confirm Modal</Button>
        </ConfirmModal.Trigger>
      </ConfirmModal>
    );
  },
  decorators: [
    (Story, { args }) => {
      return <Story args={{ ...args, type: 'warning' }} />;
    },
  ],
};
