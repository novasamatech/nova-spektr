import type { Meta, StoryObj } from '@storybook/react';

import { InputHint } from './InputHint';

const meta: Meta<typeof InputHint> = {
  title: 'ui/Input Hint',
  component: InputHint,
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
