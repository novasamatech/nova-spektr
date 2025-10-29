import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'v1/ui/Alert',
  component: Alert,
  args: {
    active: true,
    title: 'Alert title',
    children: (
      <>
        <Alert.Item>Item 1</Alert.Item>
        <Alert.Item>Item 2</Alert.Item>
        <Alert.Item>Item 3</Alert.Item>
      </>
    ),
  },
};

export default meta;

type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  args: {
    title: 'Alert title',
    children: 'This is alert message',
  },
};

export const MultipleItems: Story = {
  args: {
    children: (
      <>
        <Alert.Item>Item 1</Alert.Item>
        <Alert.Item>Item 2</Alert.Item>
        <Alert.Item>Item 3</Alert.Item>
      </>
    ),
  },
};

export const Warning: Story = {
  args: {
    variant: 'warn',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
  },
};
