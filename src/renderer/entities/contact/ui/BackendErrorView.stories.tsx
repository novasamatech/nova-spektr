import { type Meta, type StoryObj } from '@storybook/react-vite';

import { BackendErrorView } from './BackendErrorView';

const meta: Meta<typeof BackendErrorView> = {
  title: 'Address Book/BackendErrorView',
  component: BackendErrorView,
  args: {
    onRetry: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof BackendErrorView>;

export const NetworkError: Story = {
  args: {
    error: 'TypeError: Failed to fetch — ECONNREFUSED',
  },
};

export const AuthError: Story = {
  args: {
    error: '401 Unauthorized — session token expired',
  },
};

export const TimeoutError: Story = {
  args: {
    error: 'AbortError: The operation was aborted (timed out)',
  },
};

export const GenericError: Story = {
  args: {
    error: 'Internal server error: unexpected null pointer',
  },
};
