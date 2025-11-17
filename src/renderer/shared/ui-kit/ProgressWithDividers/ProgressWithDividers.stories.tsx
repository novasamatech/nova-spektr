import { type Meta, type StoryObj } from '@storybook/react-vite';

import { ProgressWithDividers } from './ProgressWithDividers';

const meta: Meta<typeof ProgressWithDividers> = {
  title: 'Design System/kit/ProgressWithDividers',
  component: ProgressWithDividers,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A progress component with dividers that displays segments with different colors, labels, and top information. Each segment can be clicked to show selection state.',
      },
    },
  },
  argTypes: {
    segments: {
      control: 'object',
      description: 'Array of segment configurations',
    },
    currentSegmentId: {
      control: 'select',
      description: 'The currently active segment ID',
    },
    lastLabel: {
      control: 'text',
      description: 'Label for the last segment (default: ∞)',
    },
    bottomLabelPrefix: {
      control: 'text',
      description: 'Prefix for bottom labels (default: Step)',
    },
    onSegmentClick: {
      action: 'segmentClicked',
      description: 'Callback fired when a segment is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressWithDividers>;

export const Default: Story = {
  render: args => <ProgressWithDividers {...args} />,
  args: {
    segments: [
      { id: '1', title: 'Stage 1', topLabel: 'A', color: 'bg-blue-400', width: 50 },
      { id: '2', title: 'Stage 2', topLabel: 'B', color: 'bg-green-400', width: 100 },
      { id: '3', title: 'Stage 3', topLabel: 'C', color: 'bg-yellow-400', width: 120 },
      { id: '4', title: 'Stage 4', topLabel: 'D', color: 'bg-orange-400', width: 150 },
      { id: '5', title: 'Stage 5', topLabel: 'E', color: 'bg-red-400', width: 200 },
    ],
    lastLabel: 'F',
    bottomLabelPrefix: 'STEP',
    currentSegmentId: '2',
  },
  argTypes: {
    currentSegmentId: {
      control: 'select',
      options: ['1', '2', '3', '4', '5'],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Example with 5 stages showing different states. Use the controls to change the current step and click on segments to see selection behavior.',
      },
    },
  },
};

export const FellowshipRanks: Story = {
  render: args => <ProgressWithDividers {...args} />,
  args: {
    segments: [
      { id: 'candidate', title: 'Candidate', topLabel: '0', color: 'bg-gray-300', width: 80 },
      { id: 'initiate', title: 'Initiate', topLabel: '1', color: 'bg-blue-400', width: 80 },
      { id: 'member', title: 'Member', topLabel: '2', color: 'bg-green-400', width: 80 },
      { id: 'senior', title: 'Senior', topLabel: '3', color: 'bg-yellow-400', width: 80 },
      { id: 'expert', title: 'Expert', topLabel: '4', color: 'bg-orange-400', width: 80 },
      { id: 'master', title: 'Master', topLabel: '5', color: 'bg-red-400', width: 80 },
    ],
    lastLabel: '∞',
    bottomLabelPrefix: 'RANK',
    currentSegmentId: 'member',
  },
  argTypes: {
    currentSegmentId: {
      control: 'select',
      options: ['candidate', 'initiate', 'member', 'senior', 'expert', 'master'],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fellowship ranks example showing progression from Candidate to Master. Each rank has equal width segments.',
      },
    },
  },
};

export const SimpleProgress: Story = {
  render: args => <ProgressWithDividers {...args} />,
  args: {
    segments: [
      { id: 'start', title: 'Start', topLabel: '0', color: 'bg-blue-500', width: 100 },
      { id: 'middle', title: 'Middle', topLabel: '50', color: 'bg-green-500', width: 100 },
      { id: 'end', title: 'End', topLabel: '100', color: 'bg-purple-500', width: 100 },
    ],
    lastLabel: '∞',
    bottomLabelPrefix: 'STEP',
    currentSegmentId: 'middle',
  },
  argTypes: {
    currentSegmentId: {
      control: 'select',
      options: ['start', 'middle', 'end'],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple 3-step progress example with equal width segments and percentage-based top labels.',
      },
    },
  },
};

export const CustomStyling: Story = {
  render: args => <ProgressWithDividers {...args} />,
  args: {
    segments: [
      { id: '1', title: 'Phase 1', topLabel: 'Q1', color: 'bg-indigo-500', width: 120 },
      { id: '2', title: 'Phase 2', topLabel: 'Q2', color: 'bg-purple-500', width: 120 },
      { id: '3', title: 'Phase 3', topLabel: 'Q3', color: 'bg-pink-500', width: 120 },
      { id: '4', title: 'Phase 4', topLabel: 'Q4', color: 'bg-rose-500', width: 120 },
    ],
    lastLabel: 'Next',
    bottomLabelPrefix: 'QUARTER',
    currentSegmentId: '3',
    className: 'border-2 border-gray-200 rounded-lg p-4',
  },
  argTypes: {
    currentSegmentId: {
      control: 'select',
      options: ['1', '2', '3', '4'],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom styled example with quarterly phases, custom colors, and additional CSS classes applied.',
      },
    },
  },
};
