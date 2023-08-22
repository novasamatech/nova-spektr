import type { Meta, StoryObj } from '@storybook/react';

import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Alert',
  component: Alert,
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Primary: Story = {
  args: {
    title: 'Alert title',
    variant: 'info',
    children: (
      <>
        <Alert.Item>Item 1</Alert.Item>
        <Alert.Item>Item 2</Alert.Item>
        <Alert.Item>Item 3</Alert.Item>
      </>
    ),
  },
};
