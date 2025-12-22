import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Box } from '../Box/Box';

import { type SegmentData } from './ProgressWithSegments';
import { ProgressWithSegments } from './ProgressWithSegments';

const meta: Meta<typeof ProgressWithSegments> = {
  title: 'Design System/kit/ProgressWithSegments',
  component: ProgressWithSegments,
  parameters: {
    docs: {
      description: {
        component:
          'A segmented progress bar component that displays progress across multiple segments with hover interactions and labels.',
      },
    },
  },
  argTypes: {
    currentProgress: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Current progress value (0-100)',
    },
    isHovered: {
      control: { type: 'boolean' },
      description: 'Whether the component is in hovered state',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
  render: args => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <Box width="600px" fitContainer>
        <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <ProgressWithSegments {...args} isHovered={isHovered} />
        </div>
      </Box>
    );
  },
};

export default meta;

type Story = StoryObj<typeof ProgressWithSegments>;

const sampleSegments: SegmentData[] = [
  {
    id: 'segment-1',
    label: '1',
    width: 16,
    color: 'bg-gray-400',
    filled: 1,
  },
  {
    id: 'segment-2',
    label: '2',
    width: 20,
    color: 'bg-orange-400',
    filled: 1,
  },
  {
    id: 'segment-3',
    label: '3',
    width: 28,
    color: 'bg-red-300',
    filled: 0.6,
  },
  {
    id: 'segment-4',
    label: '4',
    width: 28,
    color: 'bg-purple-300',
    filled: 0,
  },
  {
    id: 'segment-5',
    label: '5',
    width: 28,
    color: 'bg-sky-300',
    filled: 0,
  },
  {
    id: 'segment-6',
    label: '6',
    width: 32,
    color: 'bg-green-300',
    filled: 0,
  },
  {
    id: 'segment-7',
    label: '7',
    width: 32,
    color: 'bg-indigo-300',
    filled: 0,
  },
  {
    id: 'segment-8',
    label: '8',
    width: 44,
    color: 'bg-cyan-300',
    filled: 0,
  },
  {
    id: 'segment-9',
    label: '9',
    width: 44,
    color: 'bg-pink-300',
    filled: 0,
  },
];

export const Default: Story = {
  args: {
    currentProgress: 60,
    segments: sampleSegments,
    className: 'h-2 w-full',
  },
};

export const MultipleSegments: Story = {
  args: {
    currentProgress: 80,
    segments: sampleSegments,
    className: 'h-2 w-full',
  },
};

export const SingleSegment: Story = {
  args: {
    currentProgress: 75,
    segments: [
      {
        id: 'single',
        label: 'Single Progress',
        width: 200,
        color: 'bg-gray-400',
        filled: 0.75,
      },
    ],
    className: 'h-2 w-full',
  },
};

export const EmptyProgress: Story = {
  args: {
    currentProgress: 0,
    segments: sampleSegments.map(segment => ({ ...segment, filled: 0 })),
    className: 'h-2 w-full',
  },
};

export const FullProgress: Story = {
  args: {
    currentProgress: 100,
    segments: sampleSegments.map(segment => ({ ...segment, filled: 1 })),
    className: 'h-2 w-full',
  },
};

export const DifferentWidths: Story = {
  args: {
    currentProgress: 50,
    segments: [
      {
        id: 'small',
        label: 'Small',
        width: 60,
        color: 'bg-gray-400',
        filled: 1,
      },
      {
        id: 'medium',
        label: 'Medium',
        width: 100,
        color: 'bg-orange-400',
        filled: 0.5,
      },
      {
        id: 'large',
        label: 'Large',
        width: 150,
        color: 'bg-red-300',
        filled: 0,
      },
    ],
    className: 'h-2 w-full',
  },
};

export const ColorVariations: Story = {
  args: {
    currentProgress: 70,
    segments: [
      {
        id: 'purple',
        label: 'Purple',
        width: 80,
        color: 'bg-purple-300',
        filled: 1,
      },
      {
        id: 'sky',
        label: 'Sky',
        width: 80,
        color: 'bg-sky-300',
        filled: 1,
      },
      {
        id: 'green',
        label: 'Green',
        width: 100,
        color: 'bg-green-300',
        filled: 0.7,
      },
      {
        id: 'indigo',
        label: 'Indigo',
        width: 100,
        color: 'bg-indigo-300',
        filled: 0,
      },
    ],
    className: 'h-2 w-full',
  },
};

export const NoHover: Story = {
  args: {
    currentProgress: 60,
    segments: sampleSegments,
    className: 'h-2 w-full',
    isHovered: false,
  },
};
