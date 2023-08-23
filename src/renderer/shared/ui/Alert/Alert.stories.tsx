import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Design system/Alert',
  component: Alert,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof Alert>;

const UiOptions: Story['argTypes'] = {
  className: { control: false },
  onClose: { control: false },
};

export const Playground: Story = {
  args: {
    title: 'Alert title',
    variant: 'info',
    className: 'w-[420px]',
    children: (
      <>
        <Alert.Item>Tokens in stake produce rewards each era (6 hours)</Alert.Item>
        <Alert.Item>To unstake tokens you will have to wait for the unstaking period (7 days)</Alert.Item>
      </>
    ),
  },
  argTypes: UiOptions,
};

export const Error: Story = {
  render: () => (
    <Alert variant="error" title="Info alert title" className="w-[420px]">
      <Alert.Item>Invalid homeserver, username or password</Alert.Item>
    </Alert>
  ),
};

export const Warn: Story = {
  render: () => <Alert variant="warn" title="Warning alert title" className="w-[420px]" />,
};
