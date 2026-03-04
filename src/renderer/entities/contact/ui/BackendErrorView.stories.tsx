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
    category: 'network',
    message: 'TypeError: Failed to fetch — ECONNREFUSED',
  },
};

export const AuthError: Story = {
  args: {
    category: 'auth',
    message: 'Request failed with status 401: Unauthorized',
  },
};

export const TimeoutError: Story = {
  args: {
    category: 'timeout',
    message: 'AbortError: The operation was aborted (timed out)',
  },
};

export const GenericError: Story = {
  args: {
    category: 'generic',
    message: 'Internal server error: unexpected null pointer',
  },
};
