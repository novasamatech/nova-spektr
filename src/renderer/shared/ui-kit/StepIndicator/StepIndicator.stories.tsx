import { type Meta, type StoryObj } from '@storybook/react-vite';

import { StepIndicator } from './StepIndicator';

const meta: Meta<typeof StepIndicator> = {
  title: 'Design System/kit/StepIndicator',
  component: StepIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A step indicator component that displays multiple steps with visual progression states (completed, active, pending). Can be used in modals, forms, or any multi-step process.',
      },
    },
  },
  argTypes: {
    steps: {
      control: 'object',
      description: 'Array of step configurations with label, isActive, and isCompleted states',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTwoStepsFirstActive: Story = {
  args: {
    steps: [
      {
        label: 'Upload report',
        isActive: true,
        isCompleted: false,
      },
      {
        label: 'Review and submit',
        isActive: false,
        isCompleted: false,
      },
    ],
  },
};

export const WithTwoStepsSecondActive: Story = {
  args: {
    steps: [
      {
        label: 'Upload report',
        isActive: false,
        isCompleted: true,
      },
      {
        label: 'Review and submit',
        isActive: true,
        isCompleted: false,
      },
    ],
  },
};

export const WithThreeSteps: Story = {
  args: {
    steps: [
      {
        label: 'Step 1',
        isActive: false,
        isCompleted: true,
      },
      {
        label: 'Step 2',
        isActive: true,
        isCompleted: false,
      },
      {
        label: 'Step 3',
        isActive: false,
        isCompleted: false,
      },
    ],
  },
};

export const WithCompletedSteps: Story = {
  args: {
    steps: [
      {
        label: 'Upload report',
        isActive: false,
        isCompleted: true,
      },
      {
        label: 'Review and submit',
        isActive: false,
        isCompleted: true,
      },
    ],
  },
};
