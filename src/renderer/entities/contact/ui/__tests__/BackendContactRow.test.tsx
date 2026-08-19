import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { type Address } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BackendContactRow } from '../BackendContactRow';

vi.mock('@/shared/i18n', () => ({
  useI18n: vi.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const mockContact = {
  id: '1',
  name: 'Alice',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address,
  accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId,
  source: 'backend' as const,
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
      values: [{ optionId: 'fo-1', value: 'Internal' }],
    },
    { fieldId: 'f-type', fieldName: 'Type', multiSelect: false, values: [{ optionId: 'fo-2', value: 'Validator' }] },
    { fieldId: 'f-entity', fieldName: 'Entity', multiSelect: true, values: [{ optionId: 'fo-3', value: 'Parity' }] },
  ],
};

describe('entities/contact/ui/BackendContactRow', () => {
  test('should render contact with lock icon and synced label', () => {
    render(<BackendContactRow contact={mockContact} />);

    expect(screen.getByText('addressBook.backendContact.synced')).toBeInTheDocument();
  });

  test('should render contact labels', () => {
    render(<BackendContactRow contact={mockContact} />);

    expect(screen.getByText('Category: Internal')).toBeInTheDocument();
    expect(screen.getByText('Type: Validator')).toBeInTheDocument();
    expect(screen.getByText('Polkadot')).toBeInTheDocument();
    expect(screen.getByText('Entity: Parity')).toBeInTheDocument();
  });

  test('should render multi-value field labels', () => {
    const contactWithMultiValueField = {
      ...mockContact,
      fields: [
        {
          fieldId: 'f-role',
          fieldName: 'Role',
          multiSelect: true,
          values: [
            { optionId: 'fo-4', value: 'Signer' },
            { optionId: 'fo-5', value: 'Admin' },
          ],
        },
      ],
    };

    render(<BackendContactRow contact={contactWithMultiValueField} />);

    expect(screen.getByText('Role: Signer')).toBeInTheDocument();
    expect(screen.getByText('Role: Admin')).toBeInTheDocument();
  });

  test('should render multisig threshold', () => {
    const multisigContact = {
      ...mockContact,
      signatories: ['0xabc', '0xdef', '0x123'],
      threshold: 2,
    };

    render(<BackendContactRow contact={multisigContact} />);

    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  test('should handle null chain and missing field gracefully', () => {
    const minimalContact = {
      ...mockContact,
      chainId: null,
      chainName: null,
      fields: mockContact.fields.filter((f) => f.fieldName !== 'Category'),
    };

    render(<BackendContactRow contact={minimalContact} />);

    expect(screen.queryByText('Polkadot')).not.toBeInTheDocument();
    expect(screen.queryByText('Category: Internal')).not.toBeInTheDocument();
    expect(screen.getByText('Type: Validator')).toBeInTheDocument();
  });
});
