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
    updateDescription: vi.fn(),
    editStarted: vi.fn(),
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
        'addressBook.auth.reconnectButton': 'Reconnect',
        'addressBook.auth.reconnectTooltip': 'Address book is disconnected. Reconnect to restore access.',
        'operation.addDescriptionButton': 'Add description',
        'operation.cancelDescriptionButton': 'Cancel',
        'operation.descriptionLabel': 'Description',
        'operation.descriptionMultisigNotInBook': 'Multisig is not in the address book',
        'operation.descriptionPlaceholder': 'Add an optional note for this operation...',
        'operation.descriptionSaveError': 'Failed to store description',
        'operation.editDescriptionButton': 'Edit',
        'operation.editDescriptionTitle': 'Edit description',
        'operation.saveDescriptionButton': 'Save',
        'operation.showLessButton': 'Show less',
        'operation.showMoreButton': 'Show more',
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
    updateDescription: testState.updateDescription,
  },
  useOperationDescription: () => testState.description,
}));

vi.mock('@/aggregates/backend', () => ({
  authModel: { $authState: testState.stores.authState },
  backendConfigurationModel: {
    $backendUrl: testState.stores.backendUrl,
    events: { editStarted: testState.editStarted },
  },
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
  ReconnectAddressBookButton: ({ label = 'Reconnect' }: { label?: string }) => (
    <button onClick={() => testState.editStarted()}>{label}</button>
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
    testState.updateDescription.mockReset();
    testState.updateDescription.mockResolvedValue(undefined);
    testState.editStarted.mockReset();
    testState.descriptionCreated.mockReset();
    testState.values.set(testState.stores.authState, { permissions: ['operation:write'] });
    testState.values.set(testState.stores.backendUrl, 'https://backend.test');
    testState.values.set(testState.stores.contacts, [{ accountId: multisigAccountId }]);
    testState.values.set(testState.stores.hasEverConnected, true);
    testState.values.set(testState.stores.isHealthy, true);
  });

  it('shows an existing description with edit controls but without add controls', () => {
    testState.description = 'Already described';

    renderDescription();

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Already described')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add description' })).not.toBeInTheDocument();
  });

  it('renders the whole description inline without a modal', () => {
    testState.description = 'Line one\nLine two of a fairly long note';

    renderDescription();

    expect(screen.getByText(/Line one/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('collapses descriptions longer than 620 characters behind Show more / Show less', async () => {
    const user = userEvent.setup();
    testState.description = `${'lorem ipsum '.repeat(60)}TAIL`;

    renderDescription();

    expect(screen.queryByText(/TAIL/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getByText(/TAIL/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText(/TAIL/)).not.toBeInTheDocument();
  });

  it('hides edit controls for an existing description when the multisig is missing from contacts', () => {
    testState.description = 'Already described';
    testState.values.set(testState.stores.contacts, []);

    renderDescription();

    expect(screen.getByText('Already described')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('keeps the cut when the tail is one long token', () => {
    testState.description = `Note: ${'x'.repeat(700)}`;

    renderDescription();

    expect(screen.getByText(/^Note: x{100,}…$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('hides Edit but keeps Show more for a long description when editing is not allowed', () => {
    testState.description = 'x'.repeat(700);
    testState.values.set(testState.stores.contacts, []);

    renderDescription();

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
  });

  it('patches an existing description and updates the shared description cache', async () => {
    const user = userEvent.setup();
    testState.description = 'Already described';

    renderDescription();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit description' })).toBeInTheDocument();

    const field = screen.getByPlaceholderText('Add an optional note for this operation...');
    expect(field).toHaveValue('Already described');

    await user.clear(field);
    await user.type(field, 'Updated context');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(testState.updateDescription).toHaveBeenCalledWith('https://backend.test', operation.id, 'Updated context');
    });
    expect(testState.descriptionCreated).toHaveBeenCalledWith({
      id: operation.id,
      description: 'Updated context',
    });
    expect(testState.createDescription).not.toHaveBeenCalled();
  });

  it('shows slim reconnect UI when the address book is unhealthy', async () => {
    const user = userEvent.setup();
    testState.values.set(testState.stores.isHealthy, false);

    renderDescription();

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.queryByText('Address book is disconnected.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(testState.editStarted).toHaveBeenCalled();
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
