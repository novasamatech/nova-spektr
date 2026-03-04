import { type Meta, type StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

import { type BackendContact } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { CachedWithErrorView } from './CachedWithErrorView';

const mockContacts: BackendContact[] = [
  {
    id: '1',
    name: 'Treasury Multisig',
    address: TEST_ADDRESS,
    accountId: TEST_ACCOUNTS[0],
    source: 'backend',
    entityNames: ['Nova Foundation'],
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    categoryName: 'Infrastructure',
    contactTypeName: 'Multisig',
    derivationPath: null,
    ownerAccountId: null,
  },
  {
    id: '2',
    name: 'Validator Node',
    address: TEST_ADDRESS,
    accountId: TEST_ACCOUNTS[1],
    source: 'backend',
    entityNames: ['Staking Ops'],
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Kusama',
    categoryName: 'Validators',
    contactTypeName: null,
    derivationPath: null,
    ownerAccountId: null,
  },
];

const meta: Meta<typeof CachedWithErrorView> = {
  title: 'Address Book/CachedWithErrorView',
  component: CachedWithErrorView,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    errorMessage: 'TypeError: Failed to fetch — ECONNREFUSED',
    items: mockContacts,
    onSendTo: () => {},
    onRetry: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof CachedWithErrorView>;

export const Default: Story = {};
