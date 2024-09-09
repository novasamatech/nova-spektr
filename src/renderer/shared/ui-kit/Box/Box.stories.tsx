import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from './Box';

const meta: Meta<typeof Box> = {
  component: Box,
  title: 'Box',
};

export default meta;

type Story = StoryObj<typeof Box>;

const exampleBoxes = (
  <>
    <div className="h-32 w-32 rounded-md bg-red-600" />
    <div className="h-32 w-32 rounded-md bg-green-600" />
    <div className="h-32 w-32 rounded-md bg-blue-600" />
  </>
);

export const Default: Story = {
  args: {
    gap: 4,
    children: exampleBoxes,
  },
};
