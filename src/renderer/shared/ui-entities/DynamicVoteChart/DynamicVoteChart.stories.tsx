import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Box } from '@/shared/ui-kit';

import { DynamicVoteChart } from './DynamicVoteChart';

const meta: Meta<typeof DynamicVoteChart> = {
  title: 'Design System/entities/DynamicVoteChart',
  component: DynamicVoteChart,
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

type Story = StoryObj<typeof DynamicVoteChart>;

export const Default: Story = {
  args: {
    value: 30,
  },
};

export const PositiveVoteImpact: Story = {
  args: {
    value: 30,
    votesImpact: 10,
  },
};

export const NegativeVoteImpact: Story = {
  args: {
    value: 30,
    votesImpact: -10,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
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
