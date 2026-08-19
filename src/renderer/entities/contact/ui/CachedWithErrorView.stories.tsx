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
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Polkadot',
    derivationPath: null,
    ownerAccountId: null,
    signatories: null,
    threshold: null,
    fields: [
      {
        fieldId: 'f-category',
        fieldName: 'Category',
        multiSelect: false,
        values: [{ optionId: 'fo-1', value: 'Infrastructure' }],
      },
      { fieldId: 'f-type', fieldName: 'Type', multiSelect: false, values: [{ optionId: 'fo-2', value: 'Multisig' }] },
      {
        fieldId: 'f-entity',
        fieldName: 'Entity',
        multiSelect: true,
        values: [{ optionId: 'fo-3', value: 'Nova Foundation' }],
      },
    ],
  },
  {
    id: '2',
    name: 'Validator Node',
    address: TEST_ADDRESS,
    accountId: TEST_ACCOUNTS[1],
    source: 'backend',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    chainName: 'Kusama',
    derivationPath: null,
    ownerAccountId: null,
    signatories: null,
    threshold: null,
    fields: [
      {
        fieldId: 'f-category',
        fieldName: 'Category',
        multiSelect: false,
        values: [{ optionId: 'fo-4', value: 'Validators' }],
      },
      {
        fieldId: 'f-entity',
        fieldName: 'Entity',
        multiSelect: true,
        values: [{ optionId: 'fo-5', value: 'Staking Ops' }],
      },
    ],
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
    category: 'network',
    items: mockContacts,
    onSendTo: () => {},
    onRetry: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof CachedWithErrorView>;

export const Default: Story = {};
