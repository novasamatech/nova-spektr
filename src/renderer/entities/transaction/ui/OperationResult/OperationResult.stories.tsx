import type { Meta, StoryObj } from '@storybook/react';

import { OperationResult } from './OperationResult';

const meta: Meta<typeof OperationResult> = {
  title: 'Redesign/Operation Result',
  component: OperationResult,
};

export default meta;
type Story = StoryObj<typeof OperationResult>;

export const Primary: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Success',
    description: 'Success Success Success Success',
  },
};
