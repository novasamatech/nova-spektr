import type { Meta, StoryObj } from '@storybook/react';

import { AddressWithName } from './AddressWithName';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';

const meta: Meta<typeof AddressWithName> = {
  title: 'AddressWithName',
  component: AddressWithName,
};

export default meta;
type Story = StoryObj<typeof AddressWithName>;

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
