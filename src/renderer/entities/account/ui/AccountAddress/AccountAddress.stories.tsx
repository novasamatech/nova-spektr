import type { Meta, StoryObj } from '@storybook/react';

import { TEST_ACCOUNT_ID, withVersion } from '@renderer/shared/lib/utils';
import { AccountAddress } from './AccountAddress';

const meta: Meta<typeof AccountAddress> = {
  title: 'Design system/Address',
  component: AccountAddress,
  decorators: [withVersion('1.0.0')],
};

export default meta;
type Story = StoryObj<typeof AccountAddress>;

export const Primary: Story = {
  args: {
    accountId: TEST_ACCOUNT_ID,
  },
};

export const Full: Story = {
  args: {
    accountId: TEST_ACCOUNT_ID,
    type: 'full',
  },
};
