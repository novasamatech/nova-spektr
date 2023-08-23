import type { Meta, StoryObj } from '@storybook/react';

import { TEST_ACCOUNT_ID, withVersion } from '@renderer/shared/lib/utils';
import { AddressWithName } from './AddressWithName';

const meta: Meta<typeof AddressWithName> = {
  title: 'Design system/AddressWithName',
  component: AddressWithName,
  decorators: [withVersion('1.0.0')],
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
