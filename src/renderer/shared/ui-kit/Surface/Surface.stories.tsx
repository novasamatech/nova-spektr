import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '../Box/Box';

import { Surface } from './Surface';

const meta: Meta<typeof Surface> = {
  component: Surface,
  title: 'Design System/kit/Surface',
};

export default meta;

type Story = StoryObj<typeof Surface>;

const exampleBox = (
  <Box gap={2} direction="row" padding={4}>
    <div className="h-32 w-32 rounded-md bg-red-600" />
    <div className="h-32 w-32 rounded-md bg-green-600" />
    <div className="h-32 w-32 rounded-md bg-blue-600" />
  </Box>
);

export const Default: Story = {
  args: {
    children: exampleBox,
  },
};

export const Elevation1: Story = {
  args: {
    elevation: 1,
    children: exampleBox,
  },
};

export const Elevation2: Story = {
  args: {
    elevation: 2,
    children: exampleBox,
  },
};
