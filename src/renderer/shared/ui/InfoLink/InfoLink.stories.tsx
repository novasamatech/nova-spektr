import type { Meta, StoryObj } from '@storybook/react';

import { withVersion } from '@renderer/shared/lib/utils/storybook';
import { InfoLink } from './InfoLink';

const meta: Meta<typeof InfoLink> = {
  title: 'Design system/InfoLink',
  component: InfoLink,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof InfoLink>;

export const WithIcon: Story = {
  args: {
    url: 'https://test.com',
    children: 'This is my link',
    showIcon: true,
    iconName: 'novawallet',
  },
};

export const NoIcon: Story = {
  args: {
    url: 'https://test.com',
    children: 'This is my link',
  },
};
