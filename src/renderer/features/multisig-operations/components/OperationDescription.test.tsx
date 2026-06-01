import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';

import { OperationDescription } from './OperationDescription';

const testState = vi.hoisted(() => {
  const stores = {
    authState: Symbol('authState'),
    backendUrl: Symbol('backendUrl'),
    contacts: Symbol('contacts'),
    hasEverConnected: Symbol('hasEverConnected'),
    isHealthy: Symbol('isHealthy'),
  };

  return {
    stores,
    description: null as string | null,
    createDescription: vi.fn(),
    descriptionCreated: vi.fn(),
    values: new Map<symbol, unknown>(),
  };
});

vi.mock('effector-react', () => ({
  useUnit: (shape: Record<string, symbol> | symbol) => {
    if (typeof shape === 'symbol') return testState.values.get(shape);

    return Object.fromEntries(Object.entries(shape).map(([key, store]) => [key, testState.values.get(store)]));
  },
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'operation.addDescriptionButton': 'Add description',
        'operation.cancelDescriptionButton': 'Cancel',
        'operation.descriptionLabel': 'Description',
        'operation.descriptionMultisigNotInBook': 'Multisig is not in the address book',
        'operation.descriptionPlaceholder': 'Add an optional note for this operation...',
        'operation.descriptionSaveError': 'Failed to store description',
        'operation.saveDescriptionButton': 'Save',
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, components }: { i18nKey: string; components: { account: ReactNode } }) => (
    <span>
      {i18nKey} {components.account}
    </span>
  ),
}));

vi.mock('@/domains/backend', () => ({
  HttpError: class HttpError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  PERMISSIONS: {
    OPERATION_WRITE: 'operation:write',
  },
  operationDescriptionsResource: {
    descriptionCreated: testState.descriptionCreated,
  },
  operationsService: {
    createDescription: testState.createDescription,
  },
  useOperationDescription: () => testState.description,
}));

vi.mock('@/aggregates/backend', () => ({
  authModel: { $authState: testState.stores.authState },
  backendConfigurationModel: { $backendUrl: testState.stores.backendUrl },
  connectionHistoryModel: { $hasEverConnected: testState.stores.hasEverConnected },
}));

vi.mock('@/entities/contact', () => ({
  contactModel: { $backendContacts: testState.stores.contacts },
}));

vi.mock('@/features/contacts', () => ({
  AddressBookHealthOverlay: ({ isHealthy, children }: { isHealthy?: boolean; children: ReactNode }) => (
    <div>
      {children}
      {isHealthy === false && <button>Reconnect</button>}
    </div>
  ),
  backendContactsModel: { $isHealthy: testState.stores.isHealthy },
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId }: { accountId: AccountId }) => <span>{accountId}</span>,
}));

const multisigAccountId = '0xmultisig' as AccountId;
const operation = {
  id: '0x00-0xcall-0xmultisig-100-2',
  chainId: '0x00',
  multisigAccountId,
  callHash: '0xcall',
  blockCreated: 100,
  indexCreated: 2,
} as unknown as MultisigOperation;

const chain = {
  chainId: '0x00',
} as unknown as Chain;

const renderDescription = () => render(<OperationDescription operation={operation} chain={chain} />);

describe('OperationDescription', () => {
  beforeEach(() => {
    testState.description = null;
    testState.createDescription.mockReset();
    testState.createDescription.mockResolvedValue(undefined);
    testState.descriptionCreated.mockReset();
    testState.values.set(testState.stores.authState, { permissions: ['operation:write'] });
    testState.values.set(testState.stores.backendUrl, 'https://backend.test');
    testState.values.set(testState.stores.contacts, [{ accountId: multisigAccountId }]);
    testState.values.set(testState.stores.hasEverConnected, true);
    testState.values.set(testState.stores.isHealthy, true);
  });

  it('shows an existing description as read-only without add controls', () => {
    testState.description = 'Already described';

    renderDescription();

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Already described')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add description' })).not.toBeInTheDocument();
  });

  it('shows reconnect UI when the address book is unhealthy', () => {
    testState.values.set(testState.stores.isHealthy, false);

    renderDescription();

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add an optional note for this operation...')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
  });

  it('shows the address-book error when the multisig is missing from contacts', () => {
    testState.values.set(testState.stores.contacts, []);

    renderDescription();

    expect(screen.getByText(/operation.descriptionMultisigNotInBook/)).toBeInTheDocument();
    expect(screen.getByText(multisigAccountId)).toBeInTheDocument();
  });

  it('posts a new description and updates the shared description cache', async () => {
    const user = userEvent.setup();

    renderDescription();

    await user.click(screen.getByRole('button', { name: 'Add description' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add description' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Add an optional note for this operation...'), 'External context');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(testState.createDescription).toHaveBeenCalledWith('https://backend.test', {
        multisigAccountId,
        chainId: '0x00',
        callHash: '0xcall',
        blockNumber: 100,
        extrinsicIndex: 2,
        description: 'External context',
      });
    });
    expect(testState.descriptionCreated).toHaveBeenCalledWith({
      id: operation.id,
      description: 'External context',
    });
  });
});
