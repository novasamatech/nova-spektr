import { ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TEST_ACCOUNTS, TEST_ADDRESS, getNativeAssetId, toAccountId } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
import { decodeCallData } from '@/entities/transaction';
// eslint-disable-next-line boundaries/entry-point
import { metadata } from '@/entities/transaction/lib/__tests__/metadata';

import { getRecipientCheck } from './get-destination-account-id';

const ORIGIN = toAccountId(TEST_ADDRESS);
const STRANGER = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

/** The recipient check over call data decoded by the real decoder. */
describe('getRecipientCheck on decoded call data', () => {
  const registry = new TypeRegistry();
  let provider: MockProvider;
  let api: ApiPromise;
  let nativeAssetId: string;

  beforeAll(async () => {
    provider = new MockProvider(registry);
    const genesisHash = registry.createType('Hash', await provider.send('chain_getBlockHash', [])).toHex();

    api = await ApiPromise.create({
      metadata: { [`${genesisHash}-0`]: metadata },
      provider,
      registry,
      throwOnConnect: true,
    });
    nativeAssetId = getNativeAssetId(polkadotChain.assets);
  });

  afterAll(() => provider.disconnect());

  const checkOf = (tx: SubmittableExtrinsic<'promise'>) =>
    getRecipientCheck(decodeCallData(api, ORIGIN, tx.method.toHex(), nativeAssetId));

  it('returns the account of setPayee(Account) and nothing for setPayee(Staked)', () => {
    expect(checkOf(api.tx.staking.setPayee({ Account: STRANGER }))).toEqual({
      kind: 'recipients',
      accountIds: [toAccountId(STRANGER)],
    });
    expect(checkOf(api.tx.staking.setPayee('Staked'))).toEqual({ kind: 'no-recipient' });
  });

  it('returns the account payee of bond and nothing for a staked one', () => {
    expect(checkOf(api.tx.staking.bond(1, { Account: TEST_ADDRESS }))).toEqual({
      kind: 'recipients',
      accountIds: [TEST_ACCOUNTS[0]],
    });
    expect(checkOf(api.tx.staking.bond(1, 'Stash'))).toEqual({ kind: 'no-recipient' });
  });

  it('returns the beneficiary of an xcm transfer and the dest of a transfer', () => {
    const id = `0x${'33'.repeat(32)}`;
    const xcm = api.tx.xcmPallet!.limitedReserveTransferAssets!(
      { V3: { parents: 0, interior: { X1: { Parachain: 1000 } } } },
      { V3: { parents: 0, interior: { X1: { AccountId32: { network: null, id } } } } },
      { V3: [] },
      0,
      'Unlimited',
    );

    expect(checkOf(xcm)).toEqual({ kind: 'recipients', accountIds: [id] });
    expect(checkOf(api.tx.balances.transferKeepAlive(STRANGER, 1))).toEqual({
      kind: 'recipients',
      accountIds: [toAccountId(STRANGER)],
    });
  });
});
