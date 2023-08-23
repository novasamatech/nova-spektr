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
