import { describe, expect, it } from 'vitest';

import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

import { getXcmTransactionBeneficiaries, isXcmTransactionType } from './beneficiaries';

const ALICE = `0x${'11'.repeat(32)}`;
const BOB = `0x${'22'.repeat(32)}`;

const location = (id: string) => ({ parents: 0, interior: { x1: [{ accountId32: { network: null, id } }] } });
const callOf = (type: TransactionType | undefined, args: Record<string, unknown>) =>
  ({ type, section: 'any', method: 'any', args }) as unknown as DecodedTransaction;

describe('isXcmTransactionType', () => {
  it('recognises every XCM call type and nothing else', () => {
    expect(isXcmTransactionType(TransactionType.XCM_LIMITED_TRANSFER)).toBe(true);
    expect(isXcmTransactionType(TransactionType.XTOKENS_TRANSFER_MULTIASSETS)).toBe(true);
    expect(isXcmTransactionType(TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN)).toBe(true);
    expect(isXcmTransactionType(TransactionType.TRANSFER)).toBe(false);
    expect(isXcmTransactionType(undefined)).toBe(false);
  });
});

describe('getXcmTransactionBeneficiaries', () => {
  it('is unreadable (null) for a non-XCM transaction or one without a type', () => {
    expect(getXcmTransactionBeneficiaries(callOf(TransactionType.TRANSFER, { dest: TEST_ADDRESS }))).toBeNull();
    expect(getXcmTransactionBeneficiaries(callOf(undefined, { beneficiary: location(ALICE) }))).toBeNull();
  });

  it('reads a beneficiary given as a plain address or account id', () => {
    expect(
      getXcmTransactionBeneficiaries(callOf(TransactionType.XCM_LIMITED_TRANSFER, { beneficiary: TEST_ADDRESS })),
    ).toEqual([TEST_ACCOUNTS[0]]);
    expect(
      getXcmTransactionBeneficiaries(callOf(TransactionType.POLKADOT_XCM_TRANSFER_ASSETS, { beneficiary: ALICE })),
    ).toEqual([ALICE]);
  });

  it('reads a beneficiary location as an object or as the decoder JSON string', () => {
    expect(
      getXcmTransactionBeneficiaries(callOf(TransactionType.POLKADOT_XCM_TELEPORT, { beneficiary: location(ALICE) })),
    ).toEqual([ALICE]);
    expect(
      getXcmTransactionBeneficiaries(
        callOf(TransactionType.XCM_TELEPORT, { beneficiary: JSON.stringify({ v4: location(ALICE) }) }),
      ),
    ).toEqual([ALICE]);
  });

  it('reads the recipient of an xTokens transfer from its dest location', () => {
    const dest = JSON.stringify({
      v3: { parents: 1, interior: { x2: [{ parachain: 1000 }, { accountId32: { network: null, id: BOB } }] } },
    });

    expect(getXcmTransactionBeneficiaries(callOf(TransactionType.XTOKENS_TRANSFER, { dest }))).toEqual([BOB]);
    expect(
      getXcmTransactionBeneficiaries(callOf(TransactionType.XTOKENS_TRANSFER_MULTIASSET, { dest, beneficiary: ALICE })),
    ).toEqual([BOB]);
  });

  it('collects every deposit of a type-and-then program', () => {
    const customXcmOnDest = JSON.stringify({
      v4: [ALICE, BOB].map((id) => ({ depositAsset: { assets: { wild: { all: null } }, beneficiary: location(id) } })),
    });

    expect(
      getXcmTransactionBeneficiaries(
        callOf(TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN, { customXcmOnDest }),
      ),
    ).toEqual([ALICE, BOB]);
  });

  it('is unreadable (null) when the recipient can not be read', () => {
    expect(
      getXcmTransactionBeneficiaries(callOf(TransactionType.POLKADOT_XCM_TRANSFER_ASSETS, { beneficiary: 'garbage' })),
    ).toBeNull();
    expect(getXcmTransactionBeneficiaries(callOf(TransactionType.XTOKENS_TRANSFER, {}))).toBeNull();
    expect(
      getXcmTransactionBeneficiaries(callOf(TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN, {})),
    ).toBeNull();
  });

  it('is unreadable (null) for a type-and-then program that names no recipient', () => {
    expect(
      getXcmTransactionBeneficiaries(
        callOf(TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN, {
          customXcmOnDest: JSON.stringify({ v4: [] }),
        }),
      ),
    ).toBeNull();
  });
});
