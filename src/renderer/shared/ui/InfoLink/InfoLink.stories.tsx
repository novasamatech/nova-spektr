import type { Meta, StoryObj } from '@storybook/react';

import { InfoLink } from './InfoLink';

const meta: Meta<typeof InfoLink> = {
  title: 'ui/Info Link',
  component: InfoLink,
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
