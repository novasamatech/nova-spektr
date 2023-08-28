import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { OperationResult } from './OperationResult';

const meta: Meta<typeof OperationResult> = {
  title: 'Design system/OperationResult',
  component: OperationResult,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof OperationResult>;

export const Playground: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Success',
    description: 'Success Success Success Success',
  },
};
