import { type ApiPromise } from '@polkadot/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId, type DecodedTransaction, TransactionType } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';

import type * as DecodeDraft from './decode-draft-transaction';
import { decodeDraftTransaction } from './decode-draft-transaction';
import { getDraftRecipientCheck } from './recipient-check';

vi.mock('./decode-draft-transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeDraft>()),
  decodeDraftTransaction: vi.fn(),
}));

const multisigId = `0x${'11'.repeat(32)}` as AccountId;
const proxiedId = `0x${'22'.repeat(32)}` as AccountId;
const chain = { chainId: `0x${'aa'.repeat(32)}` as ChainId, addressPrefix: 0, assets: [] } as unknown as Chain;
const api = {} as ApiPromise;

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

const remark = {
  type: TransactionType.REMARK,
  section: 'system',
  method: 'remark',
  args: {},
} as unknown as DecodedTransaction;

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
