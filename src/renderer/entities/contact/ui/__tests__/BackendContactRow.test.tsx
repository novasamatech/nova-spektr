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
  entityNames: ['Parity'],
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  chainName: 'Polkadot',
  categoryName: 'Internal',
  contactTypeName: 'Validator',
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  tags: [],
};

describe('entities/contact/ui/BackendContactRow', () => {
  test('should render contact with lock icon and synced label', () => {
    render(<BackendContactRow contact={mockContact} />);

    expect(screen.getByText('addressBook.backendContact.synced')).toBeInTheDocument();
  });

  test('should render contact labels', () => {
    render(<BackendContactRow contact={mockContact} />);

    expect(screen.getByText('Internal')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByText('Polkadot')).toBeInTheDocument();
    expect(screen.getByText('Parity')).toBeInTheDocument();
  });

  test('should render tag labels', () => {
    const contactWithTags = {
      ...mockContact,
      tags: [{ tagName: 'Role', values: ['Signer', 'Admin'] }],
    };

    render(<BackendContactRow contact={contactWithTags} />);

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

  test('should handle null chain and category gracefully', () => {
    const minimalContact = {
      ...mockContact,
      chainId: null,
      chainName: null,
      categoryName: null,
    };

    render(<BackendContactRow contact={minimalContact} />);

    expect(screen.queryByText('Polkadot')).not.toBeInTheDocument();
    expect(screen.queryByText('Internal')).not.toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
  });
});
