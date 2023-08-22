import type { Meta, StoryObj } from '@storybook/react';

import { TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { Identicon } from './Identicon';

const meta: Meta<typeof Identicon> = {
  title: 'Identicon',
  component: Identicon,
};

export default meta;
type Story = StoryObj<typeof Identicon>;

export const Primary: Story = {
  args: {
    size: 32,
    address: TEST_ADDRESS,
  },
};

export const WithSignBadge: Story = {
  args: {
    size: 32,
    address: TEST_ADDRESS,
  },
};
