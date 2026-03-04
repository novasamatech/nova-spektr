import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type BackendContact } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { BackendContactRow } from './BackendContactRow';

const mockContact: BackendContact = {
  id: '1',
  name: 'Treasury Multisig',
  address: TEST_ADDRESS,
  accountId: TEST_ACCOUNTS[0],
  source: 'backend',
  entityNames: ['Nova Foundation', 'Treasury'],
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  chainName: 'Polkadot',
  categoryName: 'Infrastructure',
  contactTypeName: 'Multisig',
  derivationPath: null,
  ownerAccountId: null,
};

const meta: Meta<typeof BackendContactRow> = {
  title: 'Address Book/BackendContactRow',
  component: BackendContactRow,
  decorators: [
    (Story) => (
      <ul>
        <Story />
      </ul>
    ),
  ],
  args: {
    contact: mockContact,
    onSendTo: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof BackendContactRow>;

export const Default: Story = {};

export const MinimalLabels: Story = {
  args: {
    contact: {
      ...mockContact,
      id: '2',
      name: 'Simple Contact',
      contactTypeName: null,
      entityNames: [],
    },
  },
};
