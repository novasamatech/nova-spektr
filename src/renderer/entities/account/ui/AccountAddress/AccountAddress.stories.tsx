import type { Meta, StoryObj } from '@storybook/react';

import { AccountAddress } from './AccountAddress';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';

const meta: Meta<typeof AccountAddress> = {
  title: 'Redesign/Address',
  component: AccountAddress,
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
