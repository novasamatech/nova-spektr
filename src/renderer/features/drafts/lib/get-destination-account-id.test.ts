import { type ApiPromise } from '@polkadot/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId, type DecodedTransaction, TransactionType } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';

import type * as DecodeDraft from './decode-draft-transaction';
import { decodeDraftTransaction } from './decode-draft-transaction';
import { getDraftRecipientCheck, getRecipientCheck } from './get-destination-account-id';

vi.mock('./decode-draft-transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeDraft>()),
  decodeDraftTransaction: vi.fn(),
}));

const multisigId = `0x${'11'.repeat(32)}` as AccountId;
const proxiedId = `0x${'22'.repeat(32)}` as AccountId;
const chain = { chainId: `0x${'aa'.repeat(32)}` as ChainId, addressPrefix: 0, assets: [] } as unknown as Chain;
const api = {} as ApiPromise;
const STRANGER = `0x${'33'.repeat(32)}` as AccountId;

const draft: Draft = {
  id: 'draft-1',
  operation: null,
  multisigAccountId: multisigId,
  proxyAccountId: null,
  chainId: chain.chainId,
  callData: '0x0403001122',
  description: null,
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath: [],
  initiatorAccountId: null,
};

const transferTx = {
  type: TransactionType.TRANSFER,
  section: 'balances',
  method: 'transferKeepAlive',
  chainId: chain.chainId,
  address: TEST_ADDRESS,
  args: { dest: TEST_ADDRESS, value: '1' },
} as unknown as DecodedTransaction;

const transferTo = (dest: string) => ({ ...transferTx, args: { dest, value: '1' } }) as unknown as DecodedTransaction;
const proxyOf = (transaction: DecodedTransaction) =>
  ({
    type: TransactionType.PROXY,
    section: 'proxy',
    method: 'proxy',
    args: { transaction },
  }) as unknown as DecodedTransaction;
const batchOf = (...transactions: DecodedTransaction[]) =>
  ({
    type: TransactionType.BATCH_ALL,
    section: 'utility',
    method: 'batchAll',
    args: { transactions },
  }) as unknown as DecodedTransaction;
const remark = {
  type: TransactionType.REMARK,
  section: 'system',
  method: 'remark',
  args: {},
} as unknown as DecodedTransaction;
const callOf = (type: TransactionType | undefined, args: Record<string, unknown>) =>
  ({ type, section: 'any', method: 'any', args }) as unknown as DecodedTransaction;

// Decoded call data keeps XCM args as JSON strings of the versioned codecs.
const location = (id: string) => ({ parents: 0, interior: { x1: [{ accountId32: { network: null, id } }] } });
const xcmTransferTo = (id: string, type = TransactionType.POLKADOT_XCM_TRANSFER_ASSETS) =>
  callOf(type, {
    dest: JSON.stringify({ v4: { parents: 1, interior: { x1: [{ parachain: 1000 }] } } }),
    beneficiary: JSON.stringify({ v4: location(id) }),
  });
const xcmProgramTo = (...ids: string[]) =>
  callOf(TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN, {
    customXcmOnDest: JSON.stringify({
      v4: ids.map((id) => ({ depositAsset: { assets: { wild: { all: null } }, beneficiary: location(id) } })),
    }),
  });

describe('getRecipientCheck', () => {
  it('reports no recipient for a missing or non-transfer transaction', () => {
    expect(getRecipientCheck(null)).toEqual({ kind: 'no-recipient' });
    expect(getRecipientCheck(remark)).toEqual({ kind: 'no-recipient' });
    expect(getRecipientCheck(batchOf(remark, remark))).toEqual({ kind: 'no-recipient' });
  });

  it('extracts the transfer dest as an AccountId', () => {
    expect(getRecipientCheck(transferTx)).toEqual({ kind: 'recipients', accountIds: [TEST_ACCOUNTS[0]] });
  });

  it('collects every recipient of a batch', () => {
    expect(getRecipientCheck(batchOf(transferTx, transferTo(STRANGER)))).toEqual({
      kind: 'recipients',
      accountIds: [TEST_ACCOUNTS[0], STRANGER],
    });
  });

  it('looks through a proxy wrapping a batch, skipping calls that pay no one', () => {
    expect(getRecipientCheck(proxyOf(batchOf(remark, transferTo(STRANGER))))).toEqual({
      kind: 'recipients',
      accountIds: [STRANGER],
    });
  });

  it('lists a recipient paid twice once', () => {
    expect(getRecipientCheck(batchOf(transferTx, transferTx))).toEqual({
      kind: 'recipients',
      accountIds: [TEST_ACCOUNTS[0]],
    });
  });

  it('is unresolved when any transfer has an unreadable dest', () => {
    expect(getRecipientCheck(transferTo('not-an-address'))).toEqual({ kind: 'unresolved' });
    expect(getRecipientCheck(batchOf(transferTx, transferTo('not-an-address')))).toEqual({ kind: 'unresolved' });
  });

  it('is unresolved when wrappers nest deeper than it walks', () => {
    let tx = transferTx;
    for (let i = 0; i < 20; i++) tx = proxyOf(tx);

    expect(getRecipientCheck(tx)).toEqual({ kind: 'unresolved' });
  });

  it('is unresolved when a wrapper holds no decoded call', () => {
    expect(getRecipientCheck(proxyOf(undefined as unknown as DecodedTransaction))).toEqual({ kind: 'unresolved' });
  });

  it('reads the beneficiary location of an XCM transfer', () => {
    expect(getRecipientCheck(xcmTransferTo(STRANGER))).toEqual({ kind: 'recipients', accountIds: [STRANGER] });
    expect(getRecipientCheck(xcmTransferTo(STRANGER, TransactionType.XCM_LIMITED_TRANSFER))).toEqual({
      kind: 'recipients',
      accountIds: [STRANGER],
    });
  });

  it('reads the recipient of an xTokens transfer from its dest location', () => {
    const dest = JSON.stringify({
      v3: { parents: 1, interior: { x2: [{ parachain: 1000 }, location(STRANGER).interior.x1[0]] } },
    });

    expect(getRecipientCheck(callOf(TransactionType.XTOKENS_TRANSFER, { dest }))).toEqual({
      kind: 'recipients',
      accountIds: [STRANGER],
    });
  });

  it('collects every deposit of a type-and-then program', () => {
    expect(getRecipientCheck(xcmProgramTo(TEST_ACCOUNTS[0], STRANGER))).toEqual({
      kind: 'recipients',
      accountIds: [TEST_ACCOUNTS[0], STRANGER],
    });
  });

  it('is unresolved when an XCM recipient can not be read', () => {
    expect(getRecipientCheck(callOf(TransactionType.POLKADOT_XCM_TRANSFER_ASSETS, { beneficiary: 'garbage' }))).toEqual(
      {
        kind: 'unresolved',
      },
    );
    expect(getRecipientCheck(callOf(TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN, {}))).toEqual({
      kind: 'unresolved',
    });
  });

  it('treats an Account reward destination as a recipient and the others as none', () => {
    expect(getRecipientCheck(callOf(TransactionType.DESTINATION, { payee: { Account: TEST_ADDRESS } }))).toEqual({
      kind: 'recipients',
      accountIds: [TEST_ACCOUNTS[0]],
    });
    expect(getRecipientCheck(callOf(TransactionType.BOND, { value: '1', payee: { Account: 'garbage' } }))).toEqual({
      kind: 'unresolved',
    });
    expect(getRecipientCheck(callOf(TransactionType.DESTINATION, { payee: 'Staked' }))).toEqual({
      kind: 'no-recipient',
    });
    expect(getRecipientCheck(callOf(TransactionType.BOND, { value: '1', payee: 'Stash' }))).toEqual({
      kind: 'no-recipient',
    });
  });

  it('reads the account of other calls that name one', () => {
    const recipients = { kind: 'recipients', accountIds: [TEST_ACCOUNTS[0]] };

    expect(getRecipientCheck(callOf(TransactionType.VESTED_TRANSFER, { target: TEST_ADDRESS }))).toEqual(recipients);
    expect(getRecipientCheck(callOf(TransactionType.ADD_PROXY, { delegate: TEST_ADDRESS }))).toEqual(recipients);
    expect(getRecipientCheck(callOf(TransactionType.DELEGATE, { target: TEST_ADDRESS }))).toEqual(recipients);
    expect(getRecipientCheck(callOf(TransactionType.COLLECTIVE_SALARY_PAYOUT, { beneficiary: TEST_ADDRESS }))).toEqual(
      recipients,
    );
    expect(getRecipientCheck(callOf(TransactionType.COLLECTIVE_SALARY_PAYOUT, { beneficiary: null }))).toEqual({
      kind: 'no-recipient',
    });
  });

  it('is unresolved for calls it does not understand', () => {
    expect(getRecipientCheck(callOf(undefined, {}))).toEqual({ kind: 'unresolved' });
    expect(getRecipientCheck(callOf(TransactionType.MULTISIG_AS_MULTI, { call: '0x00' }))).toEqual({
      kind: 'unresolved',
    });
    expect(getRecipientCheck(batchOf(transferTx, callOf(undefined, {})))).toEqual({ kind: 'unresolved' });
  });
});

describe('getDraftRecipientCheck', () => {
  beforeEach(() => {
    vi.mocked(decodeDraftTransaction).mockReset();
  });

  it('reports no recipient without decoding when there is nothing to decode yet', () => {
    expect(getDraftRecipientCheck(null, api, chain)).toEqual({ kind: 'no-recipient' });
    expect(getDraftRecipientCheck({ ...draft, callData: null }, api, chain)).toEqual({ kind: 'no-recipient' });
    expect(getDraftRecipientCheck(draft, null, chain)).toEqual({ kind: 'no-recipient' });
    expect(decodeDraftTransaction).not.toHaveBeenCalled();
  });

  it('decodes from the multisig origin and returns the transfer destination', () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTx);

    expect(getDraftRecipientCheck(draft, api, chain)).toEqual({ kind: 'recipients', accountIds: [TEST_ACCOUNTS[0]] });
    expect(decodeDraftTransaction).toHaveBeenCalledWith({
      callData: draft.callData,
      originAccountId: multisigId,
      api,
      chain,
    });
  });

  it('decodes from the proxied account for proxy-only drafts', () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTx);

    const proxyOnly = { ...draft, multisigAccountId: null, proxyAccountId: proxiedId };

    expect(getDraftRecipientCheck(proxyOnly, api, chain)).toEqual({
      kind: 'recipients',
      accountIds: [TEST_ACCOUNTS[0]],
    });
    expect(decodeDraftTransaction).toHaveBeenCalledWith(expect.objectContaining({ originAccountId: proxiedId }));
  });

  it('is unresolved when present call data does not decode', () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(null);

    expect(getDraftRecipientCheck(draft, api, chain)).toEqual({ kind: 'unresolved' });
  });

  it('reports no recipient for a draft that is not a transfer', () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(remark);

    expect(getDraftRecipientCheck(draft, api, chain)).toEqual({ kind: 'no-recipient' });
  });
});
