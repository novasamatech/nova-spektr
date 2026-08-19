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
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  chainName: 'Polkadot',
  derivationPath: null,
  ownerAccountId: null,
  signatories: ['0xabc', '0xdef', '0x123'],
  threshold: 2,
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
      values: [
        { optionId: 'fo-3', value: 'Nova Foundation' },
        { optionId: 'fo-4', value: 'Treasury' },
      ],
    },
    {
      fieldId: 'f-role',
      fieldName: 'Role',
      multiSelect: true,
      values: [
        { optionId: 'fo-5', value: 'Signer' },
        { optionId: 'fo-6', value: 'Admin' },
      ],
    },
  ],
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
      chainId: null,
      chainName: null,
      signatories: null,
      threshold: null,
      fields: [],
    },
  },
};

export const MultichainContact: Story = {
  args: {
    contact: {
      ...mockContact,
      id: '3',
      name: 'Multichain Member',
      chainId: null,
      chainName: null,
      signatories: null,
      threshold: null,
      fields: [
        { fieldId: 'f-type', fieldName: 'Type', multiSelect: false, values: [{ optionId: 'fo-7', value: 'Member' }] },
        {
          fieldId: 'f-team',
          fieldName: 'Team',
          multiSelect: true,
          values: [{ optionId: 'fo-8', value: 'Engineering' }],
        },
      ],
    },
  },
};
