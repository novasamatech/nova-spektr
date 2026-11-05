/* eslint-disable effector/no-getState -- the modal runs in the global scope (see `seed`), so the model is read directly */
import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Store, launch } from 'effector';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Balance,
  type DecodedTransaction,
  type MultisigAccount,
  AccountType,
  AssetType,
  CryptoType,
  SigningType,
  TransactionType,
  WalletType,
} from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { toAddress, truncate } from '@/shared/lib/utils';
import { createAccountId, dotAsset, polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { ThemeProvider } from '@/shared/ui-kit';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, accountService, accounts, transactionService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import type * as DecodeCallData from '../../lib/decode-call-data';
import { createRoundTrippedCall } from '../../lib/decode-call-data';
import type * as DecodeDraft from '../../lib/decode-draft-transaction';
import { decodeDraftTransaction } from '../../lib/decode-draft-transaction';
import { submitDraftModel } from '../../model/submit-draft-model';
import { SubmitDraftModal } from '../SubmitDraftModal';

// The api double cannot decode call data: the recipient check and the
// round-trip check are fed directly, per test.
vi.mock('../../lib/decode-draft-transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeDraft>()),
  decodeDraftTransaction: vi.fn(() => null),
}));

vi.mock('../../lib/decode-call-data', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeCallData>()),
  createRoundTrippedCall: vi.fn(() => ({})),
}));

const CHAIN_ID = polkadotChain.chainId;
const CALL_DATA = '0x0403001122';
const BACKEND_URL = 'https://address-book.test';

const MULTISIG_ID: AccountId = createAccountId('submit-multisig');
const SIGNER_ID: AccountId = createAccountId('submit-signer');
const STRANGER_1: AccountId = createAccountId('submit-stranger-one');
const STRANGER_2: AccountId = createAccountId('submit-stranger-two');

const signerAccount: AnyAccount = {
  id: 'signer-1',
  accountId: SIGNER_ID,
  walletId: 1,
  name: 'Signer',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const multisigAccount = {
  id: 'multisig-1',
  accountId: MULTISIG_ID,
  walletId: 1,
  name: 'Team multisig',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: SIGNER_ID, name: 'Signer' }],
  createdAt: 0,
} satisfies MultisigAccount as unknown as AnyAccount;

const vaultWallet = { id: 1, name: 'Vault Wallet', type: WalletType.POLKADOT_VAULT };

const signerBalance: Balance = {
  id: balanceUtils.constructBalanceId(SIGNER_ID, CHAIN_ID, dotAsset.assetId),
  accountId: SIGNER_ID,
  chainId: CHAIN_ID,
  assetId: dotAsset.assetId,
  assetType: AssetType.NATIVE,
  free: new BN('10000000000000'),
  frozen: new BN(0),
  reserved: new BN(0),
  locked: [],
  transferableMode: 'legacy',
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN('10000000000'),
};

const draft: Draft = {
  id: 'draft-1',
  operation: null,
  multisigAccountId: MULTISIG_ID,
  chainId: CHAIN_ID,
  callData: CALL_DATA,
  description: 'draft note',
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath: [
    { kind: 'multisig', accountId: MULTISIG_ID },
    { kind: 'signer', accountId: SIGNER_ID },
  ],
  initiatorAccountId: SIGNER_ID,
};

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

// Minimal api double, the same shape the drafts integration suite uses:
// `createType` for the decoder, `consts.multisig` for the deposit, and the
// genesis hash the validator keys its balance lookups on.
const fakeCall = { section: 'balances', method: 'transferKeepAlive', argsEntries: [], toHex: () => CALL_DATA };
const fakeApi = {
  createType: () => fakeCall,
  registry: { createType: () => fakeCall },
  consts: { multisig: { depositBase: new BN(20), depositFactor: new BN(1) } },
  genesisHash: { toHex: () => CHAIN_ID },
  // The network domain polls the block height of every seeded api.
  rpc: { chain: { getBlock: async () => ({ block: { header: { number: { toNumber: () => 1 } } } }) } },
} as unknown as ApiPromise;

const wrappedSentinel = {
  type: 'decoded',
  section: 'multisig',
  method: 'asMulti',
  args: {},
} as unknown as Parameters<typeof transactionService.createExtrinsic>[0];

const healthyBook = { accountId: createAccountId('backend-user'), accountName: 'Backend user', permissions: [] };

// Everything api-heavy (wrapping, extrinsic creation, fees) is stubbed at the
// service seam, like the drafts integration suite does.
const stubSeams = () => {
  vi.spyOn(transactionService, 'wrapTransaction').mockResolvedValue(wrappedSentinel);
  vi.spyOn(transactionService, 'createExtrinsic').mockReturnValue(
    {} as ReturnType<typeof transactionService.createExtrinsic>,
  );
  vi.spyOn(transactionService, 'getExtrinsicFee').mockResolvedValue(new BN(1_000_000));
  vi.spyOn(transactionService, 'getTransactionFee').mockResolvedValue(new BN(1_000_000));
};

// The modal fires the model's events imperatively (not through `useUnit`), so
// a forked scope would never see its clicks. The test therefore runs in the
// global scope and seeds the stores the flow reads with `launch`.
const seed = <T,>(store: Store<T>, value: T) => launch(store, value);

const seedFlow = () => {
  seed(networkModel.$chains, { [CHAIN_ID]: polkadotChain });
  seed(networkModel.$apis, { [CHAIN_ID]: fakeApi });
  seed(accounts.__test.$list, [multisigAccount, signerAccount]);
  seed(walletModel.__test.$rawWallets, [vaultWallet]);
  seed(balanceModel.__test.$balanceMap, { [signerBalance.id]: signerBalance });
  seed(connectionHistoryModel.$hasEverConnected, true);
  seed(authModel.$authState, healthyBook);
  seed(backendConfigurationModel.$backendUrl, BACKEND_URL);
};

const renderFlow = () => {
  submitDraftModel.flowStarted({ draft, initiator: multisigAccount, chain: polkadotChain });

  render(
    <I18Provider>
      <ThemeProvider>
        <MemoryRouter>
          <SubmitDraftModal onClose={() => {}} />
        </MemoryRouter>
      </ThemeProvider>
    </I18Provider>,
  );
};

// The readiness verdict settles after a real-timer delay; give the screen
// room for it.
const SETTLE = { timeout: 3_000 };

describe('features/drafts/components/SubmitDraftModal', () => {
  beforeAll(() => {
    // Seeding the backend url wakes the address-book health checks; they must
    // not leave the process, and an answer either way would flip the book's
    // health mid-test, so they simply never return.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );

    // DI handlers register through unscoped events at module import; the
    // global registry starts empty under test, so path resolution would see
    // every account as unavailable.
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: () => true, available: () => true });
    accountService.accountActionPermissionAnyOf.registerHandler({ body: () => true, available: () => true });
  });

  beforeEach(() => {
    vi.mocked(decodeDraftTransaction).mockReset();
    vi.mocked(decodeDraftTransaction).mockReturnValue(null);
    vi.mocked(createRoundTrippedCall).mockReset();
    vi.mocked(createRoundTrippedCall).mockReturnValue({} as ReturnType<typeof createRoundTrippedCall>);
    seedFlow();
  });

  afterEach(() => {
    submitDraftModel.flowFinished();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('SP-34: lists both batch recipients, asks for the approval acknowledgement and holds Sign until it is ticked', async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(batchToStrangers);
    stubSeams();

    renderFlow();

    const signButton = await screen.findByRole('button', { name: 'Sign with Polkadot Vault' }, SETTLE);
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    expect(screen.getByText(shortAddress(STRANGER_1))).toBeInTheDocument();
    expect(screen.getByText(shortAddress(STRANGER_2))).toBeInTheDocument();
    expect(screen.getByText('I have verified the recipient address and approve this transfer')).toBeInTheDocument();

    // Everything else the button waits on is settled: only the box holds it.
    await waitFor(() => expect(submitDraftModel.$readiness.getState()).toEqual({ status: 'ready' }), SETTLE);
    await waitFor(() => expect(submitDraftModel.$validationValid.getState()).toBe(true), SETTLE);
    expect(submitDraftModel.$recipientRiskAccepted.getState()).toBe(false);
    expect(signButton).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => expect(signButton).toBeEnabled());
    expect(submitDraftModel.$recipientRiskAccepted.getState()).toBe(true);
  });

  it('SP-38: call data that does not round-trip blocks the confirm with the invalid-data screen and no Sign button', async () => {
    vi.mocked(createRoundTrippedCall).mockReturnValue(null);
    stubSeams();

    renderFlow();

    expect(await screen.findByText("Operation data isn't valid", {}, SETTLE)).toBeInTheDocument();
    expect(screen.getByText("The call data of this operation couldn't be decoded on Polkadot.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Nothing was wrapped or handed to the signer.
    expect(submitDraftModel.$readiness.getState()).toEqual({
      status: 'blocked',
      reason: { kind: 'invalid-call-data' },
    });
    expect(submitDraftModel.$wrappedTx.getState()).toBeNull();
    expect(submitDraftModel.$wrappedExtrinsic.getState()).toBeNull();
    expect(transactionService.wrapTransaction).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(submitDraftModel.$step.getState()).toBe(submitDraftModel.Step.NONE);
  });
});
