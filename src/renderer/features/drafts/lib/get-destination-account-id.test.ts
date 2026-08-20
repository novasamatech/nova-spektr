import { type ApiPromise } from '@polkadot/api';
import { describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId, type DecodedTransaction, TransactionType } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';
import type * as TransactionEntity from '@/entities/transaction';
import { decodeCallData } from '@/entities/transaction';

import { getDestinationAccountId, getDraftDestinationAccountId } from './get-destination-account-id';

vi.mock('@/entities/transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof TransactionEntity>()),
  decodeCallData: vi.fn(),
}));

const multisigId = `0x${'11'.repeat(32)}` as AccountId;
const chain = {
  chainId: `0x${'aa'.repeat(32)}` as ChainId,
  addressPrefix: 0,
  assets: [{ assetId: 0, symbol: 'DOT', precision: 10 }],
} as unknown as Chain;
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

describe('getDestinationAccountId', () => {
  it('returns null for a missing or non-transfer transaction', () => {
    expect(getDestinationAccountId(null)).toBeNull();
    expect(
      getDestinationAccountId({ ...transferTx, type: TransactionType.BOND, args: {} } as unknown as DecodedTransaction),
    ).toBeNull();
  });

  it('extracts the transfer dest as an AccountId', () => {
    expect(getDestinationAccountId(transferTx)).toBe(TEST_ACCOUNTS[0]);
  });
});

describe('getDraftDestinationAccountId', () => {
  it('returns null without decoding when any input is missing', () => {
    vi.mocked(decodeCallData).mockClear();

    expect(getDraftDestinationAccountId(null, api, chain)).toBeNull();
    expect(getDraftDestinationAccountId(draft, null, chain)).toBeNull();
    expect(getDraftDestinationAccountId(draft, api, null)).toBeNull();
    expect(getDraftDestinationAccountId({ ...draft, callData: null }, api, chain)).toBeNull();
    expect(getDraftDestinationAccountId({ ...draft, multisigAccountId: null }, api, chain)).toBeNull();
    expect(decodeCallData).not.toHaveBeenCalled();
  });

  it('decodes the call data and returns the transfer destination', () => {
    vi.mocked(decodeCallData).mockReturnValue(transferTx);

    expect(getDraftDestinationAccountId(draft, api, chain)).toBe(TEST_ACCOUNTS[0]);
    expect(decodeCallData).toHaveBeenCalledWith(api, multisigId, draft.callData, '0');
  });

  it('returns null when decoding throws', () => {
    vi.mocked(decodeCallData).mockImplementation(() => {
      throw new Error('bad call data');
    });

    expect(getDraftDestinationAccountId(draft, api, chain)).toBeNull();
  });
});
