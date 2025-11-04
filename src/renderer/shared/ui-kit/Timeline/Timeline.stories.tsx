import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';

import { Timeline } from './Timeline';

const meta: Meta<typeof Timeline> = {
  title: 'Design System/kit/Timeline',
  component: Timeline,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
  args: {
    steps: [
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-primary-button-background-default',
        onHoverTooltipText: 'Phase 1: Planning',
        length: 2,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-green-background-default',
        onHoverTooltipText: 'Phase 2: Development',
        length: 5,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-orange-background-default',
        onHoverTooltipText: 'Phase 3: Testing',
        length: 3,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-alert-background-negative',
        onHoverTooltipText: 'Phase 4: Deployment',
        length: 2,
      },
    ],
    value: 7,
  },
  render: args => {
    return (
      <Box width="600px" gap={4}>
        <Timeline {...args} />
      </Box>
    );
  },
};

export const Interactive: Story = {
  render: () => {
    const [actualLength, setActualLength] = useState(0);

    const steps = [
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-primary-button-background-default',
        onHoverTooltipText: 'Phase 1: Planning (2 units)',
        length: 2,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-green-background-default',
        onHoverTooltipText: 'Phase 2: Development (5 units)',
        length: 5,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-orange-background-default',
        onHoverTooltipText: 'Phase 3: Testing (3 units)',
        length: 3,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-alert-background-negative',
        onHoverTooltipText: 'Phase 4: Deployment (2 units)',
        length: 2,
      },
    ];

    const totalLength = steps.reduce((sum, step) => sum + step.length, 0);

    return (
      <Box width="600px" gap={4}>
        <Timeline steps={steps} value={actualLength} />
        <Box direction="row" gap={2} horizontalAlign="center">
          <Button size="sm" onClick={() => setActualLength(Math.max(0, actualLength - 1))}>
            -
          </Button>
          <span className="text-body">
            Progress: {actualLength} / {totalLength}
          </span>
          <Button size="sm" onClick={() => setActualLength(Math.min(totalLength, actualLength + 1))}>
            +
          </Button>
        </Box>
        <Box direction="row" gap={2} horizontalAlign="center">
          <Button size="sm" onClick={() => setActualLength(0)}>
            Reset
          </Button>
          <Button size="sm" onClick={() => setActualLength(totalLength)}>
            Complete
          </Button>
        </Box>
      </Box>
    );
  },
};

export const UnevenSteps: Story = {
  args: {
    steps: [
      {
        baseColorClass: 'bg-alert-background-negative',
        filledColorClass: 'bg-badge-red-background-default',
        onHoverTooltipText: 'Short step (1 unit)',
        length: 1,
      },
      {
        baseColorClass: 'bg-alert-background-warning',
        filledColorClass: 'bg-badge-orange-background-default',
        onHoverTooltipText: 'Long step (10 units)',
        length: 10,
      },
      {
        baseColorClass: 'bg-primary-button-background-default',
        filledColorClass: 'bg-primary-button-background-active',
        onHoverTooltipText: 'Medium step (3 units)',
        length: 3,
      },
      {
        baseColorClass: 'bg-alert-background-positive',
        filledColorClass: 'bg-badge-green-background-default',
        onHoverTooltipText: 'Another medium (5 units)',
        length: 5,
      },
    ],
    value: 11,
  },
  render: args => {
    return (
      <Box width="600px" gap={4}>
        <Timeline {...args} />
      </Box>
    );
  },
};

export const FullyCompleted: Story = {
  args: {
    steps: [
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-green-background-default',
        onHoverTooltipText: 'Step 1: Complete',
        length: 3,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-green-background-default',
        onHoverTooltipText: 'Step 2: Complete',
        length: 3,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-badge-green-background-default',
        onHoverTooltipText: 'Step 3: Complete',
        length: 4,
      },
    ],
    value: 10,
  },
  render: args => {
    return (
      <Box width="400px" gap={4}>
        <Timeline {...args} />
      </Box>
    );
  },
};

export const NotStarted: Story = {
  args: {
    steps: [
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-primary-button-background-default',
        onHoverTooltipText: 'Step 1: Pending',
        length: 2,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-primary-button-background-default',
        onHoverTooltipText: 'Step 2: Pending',
        length: 2,
      },
      {
        baseColorClass: 'bg-input-background',
        filledColorClass: 'bg-primary-button-background-default',
        onHoverTooltipText: 'Step 3: Pending',
        length: 2,
      },
    ],
    value: 0,
  },
  render: args => {
    return (
      <Box width="400px" gap={4}>
        <Timeline {...args} />
      </Box>
    );
  },
};
