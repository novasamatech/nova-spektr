import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { StatusMark } from './StatusMark';

const meta: Meta<typeof StatusMark> = {
  title: 'Design system/StatusMark',
  component: StatusMark,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof StatusMark>;

const UiOptions: Story['argTypes'] = {
  className: { control: false },
};

export const Playground: Story = {
  args: {
    title: '@user_name:matrix.org',
    subtitle: 'Session verified',
    variant: 'waiting',
  },
  argTypes: UiOptions,
};

export const Success: Story = {
  render: () => <StatusMark title="Success mark" variant="success" />,
};

export const Error: Story = {
  render: () => <StatusMark title="Error mark" variant="error" subtitle="Something went wrong" />,
};
