import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Design System/kit/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, { args }) => {
      const [open, onToggle] = useState(false);

      return (
        <>
          <Button onClick={() => onToggle((x) => !x)}>Toggle Modal</Button>
          <Story args={{ ...args, open, onToggle }} />
        </>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Modal>;

const exampleBox = (
  <Box gap={2}>
    <div className="h-32 rounded-md bg-red-600" />
    <div className="h-32 rounded-md bg-green-600" />
    <div className="h-32 rounded-md bg-blue-600" />
  </Box>
);

export const Default: Story = {
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const CloseButton: Story = {
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const WithoutHeader: Story = {
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const Footer: Story = {
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
        <Modal.Footer>
          <Button onClick={() => args.onToggle(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  },
};

export const ScrollableContent: Story = {
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>
          <Box gap={2}>
            {exampleBox} {exampleBox}
          </Box>
        </Modal.Content>
        <Modal.Footer>
          <Button variant="text" onClick={() => args.onToggle(false)}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    );
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const Full: Story = {
  args: {
    size: 'full',
  },
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};

export const Adaptive: Story = {
  args: {
    size: 'full',
  },
  render(args) {
    return (
      <Modal {...args}>
        <Modal.Title close>Hello! I am a modal</Modal.Title>
        <Modal.Content>{exampleBox}</Modal.Content>
      </Modal>
    );
  },
};
