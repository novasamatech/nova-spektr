import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InputHint } from './InputHint';

const meta: Meta<typeof InputHint> = {
  title: 'Design system/Input Hint',
  component: InputHint,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InputHint>;

export const Primary: Story = {
  args: {
    active: true,
    variant: 'hint',
    children: 'Test hint text',
  },
};

export const Error: Story = {
  args: {
    active: true,
    variant: 'error',
    children: 'Test error text',
  },
};
