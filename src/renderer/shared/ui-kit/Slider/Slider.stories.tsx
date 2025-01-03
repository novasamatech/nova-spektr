import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Box } from '../Box/Box';

import { Slider } from './Slider';

const meta: Meta<typeof Slider> = {
  component: Slider,
  title: 'Design System/kit/Slider',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, { args }) => {
      return (
        <Box horizontalAlign="center" gap={4} width="400px">
          <Story />
          <span className="text-body">{Array.isArray(args.value) ? args.value.join(', ') : args.value}</span>
        </Box>
      );
    },
    (Story, { args }) => {
      const [value, onChange] = useState(args.value);

      // @ts-expect-error value type
      return <Story args={{ ...args, value, onChange }} />;
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    value: 2,
    min: 0,
    max: 5,
  },
};

export const Range: Story = {
  args: {
    value: [2, 4],
    min: 0,
    max: 6,
    range: true,
  },
};

export const Step: Story = {
  args: {
    value: 2,
    min: 0,
    max: 10,
    step: 2,
  },
};

export const Labels: Story = {
  args: {
    value: 5,
    min: 0,
    max: 9,
    renderLabel: value => {
      return <span className="text-footnote">{value}</span>;
    },
  },
};

export const ALotOfValues: Story = {
  args: {
    value: 0,
    min: 0,
    max: 100,
  },
};
