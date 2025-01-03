import { type Meta, type StoryObj } from '@storybook/react';

import { Box } from '@/shared/ui-kit';

import { VoteChart } from './VoteChart';

const meta: Meta<typeof VoteChart> = {
  title: 'Design System/entities/VoteChart',
  component: VoteChart,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <Box width="400px">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof VoteChart>;

export const Default: Story = {
  args: {
    value: 30,
    threshold: 50,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    threshold: 50,
  },
};

export const WithoutThreshold: Story = {
  args: {
    value: 50,
  },
};

export const HundredPercent: Story = {
  args: {
    value: 100,
  },
};

export const ZeroPercent: Story = {
  args: {
    value: 0,
  },
};
