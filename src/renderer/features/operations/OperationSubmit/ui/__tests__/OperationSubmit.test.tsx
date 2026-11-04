import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type Scope, allSettled, createWatch, fork } from 'effector';
import { Provider } from 'effector-react';

import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { I18Provider } from '@/shared/i18n';
import { createExtrinsicPayload, signExtrinsicPayload } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
// eslint-disable-next-line boundaries/entry-point -- reusing a real metadata blob fixture in tests only
import { metadata } from '@/domains/network/transaction/service.mocks';
import { networkModel } from '@/entities/network';
import { type SubmitInputDeprecated, submitModel } from '../../model/submit-model';
import { OperationSubmit } from '../OperationSubmit';

vi.mock('@/shared/ui/Animation/Animation', () => ({ Animation: () => null }));

const FAILED_TITLE = 'Operation Failed';
const CLOSE_BUTTON = 'Close';
const LOADING_TITLE = 'Submitting operation...';

const SIGNATURE_COUNT_MISMATCH =
  'The number of signatures does not match the number of signed transactions. Please sign the operation again.';
const NOTHING_SIGNED = 'Nothing was signed. Please sign the operation again.';
const UNKNOWN_SIGNATORY = 'A signature was not made by a signatory of this operation. Please sign the operation again.';

const createMockApi = async () => {
  const registry = new TypeRegistry();
  const provider = new MockProvider(registry);
  const firstBlockHash = await provider.send('chain_getBlockHash', []);
  const genesisHash = registry.createType('Hash', firstBlockHash).toHex();

  return ApiPromise.create({
    metadata: { [`${genesisHash}-0`]: metadata },
    provider,
    registry,
    throwOnConnect: true,
  });
};

const toAccountId = (pair: KeyringPair) => u8aToHex(pair.publicKey) as unknown as AccountId;

const chain = { chainId: '0x00' } as unknown as Chain;
const account = { accountId: '0x00' } as unknown as AnyAccount;

const createTransaction = (accountId: AccountId): Transaction => ({
  chainId: chain.chainId,
  accountId,
  type: TransactionType.TRANSFER,
  args: {},
});

type SignedInput = Pick<SubmitInputDeprecated, 'txPayloads' | 'signatures'>;

describe('OperationSubmit status modal', () => {
  let api: ApiPromise;
  let alice: KeyringPair;
  let bob: KeyringPair;

  const createSigned = (pair: KeyringPair, method: HexString, nonce: number) => {
    const payload = createExtrinsicPayload(api.registry, {
      method,
      nonce,
      genesisHash: api.genesisHash.toHex(),
      version: api.extrinsicVersion,
    });

    return signExtrinsicPayload(payload, pair);
  };

  const createMethod = (amount: number) => api.tx.balances.transferKeepAlive(alice.address, amount).method.toHex();

  const createScope = () => fork({ values: new Map().set(networkModel.$apis, { [chain.chainId]: api }) });

  /**
   * What sign-model hands over after signing: one wrapped transaction by Alice,
   * its payloads and signatures.
   */
  const submit = (scope: Scope, signed: SignedInput) => {
    const wrappedTxs = [createTransaction(toAccountId(alice))];

    return allSettled(submitModel.events.formInitiated, {
      scope,
      params: { chain, account, coreTxs: wrappedTxs, wrappedTxs, ...signed },
    });
  };

  const renderSubmit = (scope: Scope) => {
    const onClose = vi.fn();

    render(
      <Provider value={scope}>
        <I18Provider>
          <OperationSubmit isOpen onClose={onClose} />
        </I18Provider>
      </Provider>,
    );

    return { onClose };
  };

  beforeAll(async () => {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');
    api = await createMockApi();
  });

  afterAll(async () => {
    await api.disconnect();
  });

  const failures: [string, () => SignedInput, string][] = [
    [
      'a dropped signature',
      () => {
        const signed = [createSigned(alice, createMethod(1), 0), createSigned(alice, createMethod(2), 1)];

        return { txPayloads: signed.map((s) => s.payload), signatures: [signed[0]!.signature] };
      },
      SIGNATURE_COUNT_MISMATCH,
    ],
    ['nothing signed', () => ({ txPayloads: [], signatures: [] }), NOTHING_SIGNED],
    [
      'a signature by someone outside the operation',
      () => {
        const signed = createSigned(bob, createMethod(1), 0);

        return { txPayloads: [signed.payload], signatures: [signed.signature] };
      },
      UNKNOWN_SIGNATORY,
    ],
  ];

  it.each(failures)(
    'SP-52: shows "Operation Failed" with a Close button for %s and marks nothing submitted',
    async (_, createInput, description) => {
      const scope = createScope();
      const done = vi.fn();
      createWatch({ unit: submitModel.done, scope, fn: done });

      await submit(scope, createInput());
      const { onClose } = renderSubmit(scope);

      const modal = screen.getByTestId('StatusModal');
      expect(modal).toHaveTextContent(FAILED_TITLE);
      expect(modal).toHaveTextContent(description);
      expect(screen.queryByText(LOADING_TITLE)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: CLOSE_BUTTON }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(done).not.toHaveBeenCalled();
      expect(scope.getState(submitModel.$submitStore)).toBeNull();
    },
  );

  it('SP-52: starting the operation again opens the modal in the loading state, not on the old error', async () => {
    const scope = createScope();

    await submit(scope, { txPayloads: [], signatures: [] });
    renderSubmit(scope);

    expect(screen.getByTestId('StatusModal')).toHaveTextContent(FAILED_TITLE);
    expect(screen.getByTestId('StatusModal')).toHaveTextContent(NOTHING_SIGNED);

    const signed = createSigned(alice, createMethod(1), 0);
    await act(() => submit(scope, { txPayloads: [signed.payload], signatures: [signed.signature] }));

    const modal = screen.getByTestId('StatusModal');
    expect(modal).toHaveTextContent(LOADING_TITLE);
    expect(modal).not.toHaveTextContent(FAILED_TITLE);
    expect(modal).not.toHaveTextContent(NOTHING_SIGNED);
    expect(screen.queryByRole('button', { name: CLOSE_BUTTON })).not.toBeInTheDocument();
  });
});
