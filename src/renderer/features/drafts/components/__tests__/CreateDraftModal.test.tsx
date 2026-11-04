/* eslint-disable effector/no-getState -- the modal runs in the global scope (see `seed`), so the model is read directly */
import { type ApiPromise } from '@polkadot/api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Store, launch } from 'effector';
import { MemoryRouter } from 'react-router-dom';
import type * as Sonner from 'sonner';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress, truncate } from '@/shared/lib/utils';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import type * as Backend from '@/domains/backend';
import { type Draft, type PathNode, draftsService } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import type * as DecodeDraft from '../../lib/decode-draft-transaction';
import { decodeDraftTransaction } from '../../lib/decode-draft-transaction';
import { type DraftSeed, createDraftModel } from '../../model/create-draft-model';
import { CreateDraftModal } from '../CreateDraftModal';

// The modal reaches sonner through `useNotification`; the toasts are the only
// thing it says about the outcome of a create, so they are recorded.
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof Sonner>();

  return {
    ...actual,
    toast: Object.assign(vi.fn(), actual.toast, { success: toasts.success, error: toasts.error }),
  };
});

// The api double cannot decode call data; the recipient check is fed directly.
vi.mock('../../lib/decode-draft-transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeDraft>()),
  decodeDraftTransaction: vi.fn(() => null),
}));

// The backend call is the boundary: recorded so the gate in front of it can
// be asserted, answered so the success toast has something to announce.
vi.mock('@/domains/backend', async (importOriginal) => {
  const actual = await importOriginal<typeof Backend>();

  return { ...actual, draftsService: { ...actual.draftsService, createDraft: vi.fn() } };
});

const CHAIN_ID = polkadotChain.chainId;
const BACKEND_URL = 'https://address-book.test';
const VALID_CALL_DATA = '0xdeadbeef';

const MULTISIG_ID: AccountId = createAccountId('team-multisig');
const SIGNER_ID: AccountId = createAccountId('signatory');
const STRANGER_1: AccountId = createAccountId('stranger-one');
const STRANGER_2: AccountId = createAccountId('stranger-two');

const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });

const COMPLETE_PATH: PathNode[] = [multisig(MULTISIG_ID), signer(SIGNER_ID)];
const LONE_SIGNER_PATH: PathNode[] = [signer(SIGNER_ID)];

const transferTo = (dest: AccountId): DecodedTransaction =>
  ({
    type: TransactionType.TRANSFER,
    section: 'balances',
    method: 'transferKeepAlive',
    chainId: CHAIN_ID,
    address: '',
    args: { dest, value: '1' },
  }) as unknown as DecodedTransaction;

const batchToStrangers: DecodedTransaction = {
  type: TransactionType.BATCH_ALL,
  section: 'utility',
  method: 'batchAll',
  chainId: CHAIN_ID,
  address: '',
  args: { transactions: [transferTo(STRANGER_1), transferTo(STRANGER_2)] },
} as unknown as DecodedTransaction;

// What `<NamedAccount variant="short">` prints for an account nobody has named.
const shortAddress = (accountId: AccountId) =>
  truncate(toAddress(accountId, { prefix: polkadotChain.addressPrefix }), 6, 6);

const createdDraft: Draft = {
  id: 'draft-1',
  operation: null,
  multisigAccountId: MULTISIG_ID,
  chainId: CHAIN_ID,
  callData: VALID_CALL_DATA,
  description: 'Pay the team',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  signingPath: COMPLETE_PATH,
  initiatorAccountId: SIGNER_ID,
};

// Only what the modal reads off the api outside a try/catch.
const fakeApi = { runtimeVersion: { specVersion: { toNumber: () => 1 } } } as unknown as ApiPromise;

const healthyBook = { accountId: createAccountId('backend-user'), accountName: 'Backend user', permissions: [] };

// The modal fires the model's events imperatively (not through `useUnit`), so
// a forked scope would never see its clicks. The test therefore runs in the
// global scope and seeds the stores the flow reads with `launch`.
const seed = <T,>(store: Store<T>, value: T) => launch(store, value);

// Address book connected and healthy, chain api up: a recipient can be checked
// and a draft can be sent somewhere.
const connectBook = () => {
  seed(networkModel.$chains, { [CHAIN_ID]: polkadotChain });
  seed(networkModel.$apis, { [CHAIN_ID]: fakeApi });
  seed(connectionHistoryModel.$hasEverConnected, true);
  seed(authModel.$authState, healthyBook);
  seed(backendConfigurationModel.$backendUrl, BACKEND_URL);
};

const draftSeed = (path: PathNode[]): DraftSeed => ({ chainId: CHAIN_ID, callData: VALID_CALL_DATA, path });

// Opens the modal straight on the confirm step with the description filled,
// so the only thing between the user and Create is the gate under test.
const renderConfirm = async (path: PathNode[] = COMPLETE_PATH) => {
  createDraftModel.createDraftRequested(draftSeed(path));
  createDraftModel.descriptionChanged('Pay the team');
  expect(createDraftModel.$activeStep.getState()).toBe('confirm');

  render(
    <I18Provider>
      <ThemeProvider>
        <MemoryRouter>
          <CreateDraftModal />
        </MemoryRouter>
      </ThemeProvider>
    </I18Provider>,
  );

  return screen.findByRole('button', { name: 'Create' });
};

describe('features/drafts/components/CreateDraftModal', () => {
  beforeAll(() => {
    // Seeding the backend url wakes the address-book health checks; they must
    // not leave the process, and an answer either way would flip the book's
    // health mid-test, so they simply never return.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    toasts.success.mockReset();
    toasts.error.mockReset();
    vi.mocked(decodeDraftTransaction).mockReset();
    vi.mocked(decodeDraftTransaction).mockReturnValue(null);
    vi.mocked(draftsService.createDraft).mockReset();
    vi.mocked(draftsService.createDraft).mockResolvedValue(createdDraft);
    connectBook();
  });

  afterEach(() => {
    createDraftModel.modalClosed();
  });

  describe('unknown recipient acknowledgement', () => {
    it('SP-34: lists both batch recipients, asks for the draft acknowledgement and holds Create until it is ticked', async () => {
      vi.mocked(decodeDraftTransaction).mockReturnValue(batchToStrangers);

      const createButton = await renderConfirm();

      expect(screen.getByText(shortAddress(STRANGER_1))).toBeInTheDocument();
      expect(screen.getByText(shortAddress(STRANGER_2))).toBeInTheDocument();

      expect(screen.getByText('I have verified the recipient address and want to save this draft')).toBeInTheDocument();
      expect(createButton).toBeDisabled();

      await userEvent.click(screen.getByRole('checkbox'));

      await waitFor(() => expect(createButton).toBeEnabled());
      expect(createDraftModel.$isRiskAcknowledged.getState()).toBe(true);
    });
  });

  describe('create toasts', () => {
    it('SP-82: a ticked box lets Create through and the modal announces the new draft', async () => {
      vi.mocked(decodeDraftTransaction).mockReturnValue(transferTo(STRANGER_1));

      const createButton = await renderConfirm();
      expect(createButton).toBeDisabled();
      await userEvent.click(screen.getByRole('checkbox'));
      await waitFor(() => expect(createButton).toBeEnabled());

      await userEvent.click(createButton);

      await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Draft created'));
      expect(draftsService.createDraft).toHaveBeenCalledTimes(1);
      expect(draftsService.createDraft).toHaveBeenCalledWith(
        BACKEND_URL,
        expect.objectContaining({ chainId: CHAIN_ID, callData: VALID_CALL_DATA, signingPath: COMPLETE_PATH }),
      );
      expect(toasts.error).not.toHaveBeenCalled();
      expect(createDraftModel.$isOpen.getState()).toBe(false);
    });

    it('SP-82: a backend that refuses the draft is reported as a failed create, and the modal stays open', async () => {
      vi.mocked(draftsService.createDraft).mockRejectedValue(new Error('Address book unavailable'));

      const createButton = await renderConfirm();
      await waitFor(() => expect(createButton).toBeEnabled());

      await userEvent.click(createButton);

      await waitFor(() =>
        expect(toasts.error).toHaveBeenCalledWith('Failed to create draft', {
          description: 'Address book unavailable',
        }),
      );
      expect(toasts.success).not.toHaveBeenCalled();
      expect(createDraftModel.$isOpen.getState()).toBe(true);
    });

    it('SP-83: a lone-signer path is refused as an invalid signing path and never reaches the backend', async () => {
      // The confirm is otherwise ready: a lone signer is a complete path, so
      // the button is enabled and the refusal comes from the model's gate.
      const createButton = await renderConfirm(LONE_SIGNER_PATH);
      await waitFor(() => expect(createButton).toBeEnabled());

      await userEvent.click(createButton);

      // A lone signer fails the usability rule, not the grammar, so the
      // validator has no reason to attach: the description stays empty.
      await waitFor(() =>
        expect(toasts.error).toHaveBeenCalledWith('Signing path is invalid', { description: undefined }),
      );
      expect(toasts.error).toHaveBeenCalledTimes(1);
      expect(toasts.success).not.toHaveBeenCalled();
      expect(draftsService.createDraft).not.toHaveBeenCalled();
      expect(createDraftModel.$isOpen.getState()).toBe(true);
    });
  });
});
