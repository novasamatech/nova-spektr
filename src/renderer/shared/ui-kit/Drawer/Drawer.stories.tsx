import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Drawer } from './Drawer';

const meta: Meta<typeof Drawer> = {
  title: 'Design System/kit/Drawer',
  component: Drawer,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Drawer>;

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
      <Drawer {...args}>
        <Drawer.Title close>Hello! I am a drawer</Drawer.Title>
        <Drawer.Content>{exampleBox}</Drawer.Content>
      </Drawer>
    );
  },
  decorators: [
    (Story, { args }) => {
      const [isOpen, onToggle] = useState(false);

      return (
        <>
          <Button onClick={() => onToggle(x => !x)}>Toggle Drawer</Button>
          <Story args={{ ...args, isOpen, onToggle }} />
        </>
      );
    },
  ],
};

export const CustomWidth: Story = {
  args: {
    width: 400,
  },
  render(args) {
    return (
      <Drawer {...args}>
        <Drawer.Title close>Narrow drawer</Drawer.Title>
        <Drawer.Content>{exampleBox}</Drawer.Content>
      </Drawer>
    );
  },
  decorators: [
    (Story, { args }) => {
      const [isOpen, onToggle] = useState(false);

      return (
        <>
          <Button onClick={() => onToggle(x => !x)}>Toggle Drawer</Button>
          <Story args={{ ...args, isOpen, onToggle }} />
        </>
      );
    },
  ],
};

export const WithFooter: Story = {
  render(args) {
    return (
      <Drawer {...args}>
        <Drawer.Title close>Drawer with footer</Drawer.Title>
        <Drawer.Content>{exampleBox}</Drawer.Content>
        <Drawer.Footer>
          <Button onClick={() => args.onToggle?.(false)}>Close</Button>
        </Drawer.Footer>
      </Drawer>
    );
  },
  decorators: [
    (Story, { args }) => {
      const [isOpen, onToggle] = useState(false);

      return (
        <>
          <Button onClick={() => onToggle(x => !x)}>Toggle Drawer</Button>
          <Story args={{ ...args, isOpen, onToggle }} />
        </>
      );
    },
  ],
};

export const ScrollableContent: Story = {
  render(args) {
    return (
      <Drawer {...args}>
        <Drawer.Title close>Scrollable drawer</Drawer.Title>
        <Drawer.Content>
          <Box gap={2}>
            {exampleBox} {exampleBox} {exampleBox} {exampleBox}
          </Box>
        </Drawer.Content>
      </Drawer>
    );
  },
  decorators: [
    (Story, { args }) => {
      const [isOpen, onToggle] = useState(false);

      return (
        <>
          <Button onClick={() => onToggle(x => !x)}>Toggle Drawer</Button>
          <Story args={{ ...args, isOpen, onToggle }} />
        </>
      );
    },
  ],
};

export const Trigger: Story = {
  render(args) {
    return (
      <Drawer {...args}>
        <Drawer.Trigger>
          <Button>Toggle drawer with trigger</Button>
        </Drawer.Trigger>
        <Drawer.Title close>Hello! I am a drawer</Drawer.Title>
        <Drawer.Content>{exampleBox}</Drawer.Content>
      </Drawer>
    );
  },
};
