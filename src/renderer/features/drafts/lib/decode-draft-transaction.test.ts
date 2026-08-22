import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type CallData } from '@/shared/core';
import { polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft, type PathNode } from '@/domains/backend';
// eslint-disable-next-line boundaries/entry-point -- reusing a real metadata blob fixture in tests only
import { metadata } from '@/entities/transaction/lib/__tests__/metadata';

import { decodeDraftTransaction, getDraftOriginAccountId, getPathOriginAccountId } from './decode-draft-transaction';

const multisigId = `0x${'11'.repeat(32)}` as AccountId;
const proxiedId = `0x${'22'.repeat(32)}` as AccountId;
const signerId = `0x${'33'.repeat(32)}` as AccountId;

// balances.transferKeepAlive(Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3, 1 DOT)
const TRANSFER_CALL_DATA: CallData =
  '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8';
// Same bytes, truncated: the lenient `createType('Call')` still parses it.
const TRUNCATED_CALL_DATA: CallData = '0x0403';

const draft: Draft = {
  id: 'draft-1',
  operation: null,
  multisigAccountId: multisigId,
  proxyAccountId: null,
  chainId: polkadotChain.chainId,
  callData: TRANSFER_CALL_DATA,
  description: null,
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath: [],
  initiatorAccountId: null,
};

describe('decodeDraftTransaction', () => {
  const registry = new TypeRegistry();
  let provider: MockProvider;
  let api: ApiPromise;

  beforeAll(async () => {
    provider = new MockProvider(registry);
    const genesisHash = registry.createType('Hash', await provider.send('chain_getBlockHash', [])).toHex();

    api = await ApiPromise.create({
      metadata: { [`${genesisHash}-0`]: metadata },
      provider,
      registry,
      throwOnConnect: true,
    });
  });

  afterAll(() => provider.disconnect());

  it('decodes a transfer with the origin as sender and the recipient intact', () => {
    const decoded = decodeDraftTransaction({
      callData: TRANSFER_CALL_DATA,
      originAccountId: multisigId,
      api,
      chain: polkadotChain,
    });

    expect(decoded).toMatchObject({
      accountId: multisigId,
      section: 'balances',
      method: 'transferKeepAlive',
      args: { dest: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3', value: '1000000000000' },
    });
  });

  it('reads the same recipient regardless of the origin account', () => {
    const viaMultisig = decodeDraftTransaction({
      callData: TRANSFER_CALL_DATA,
      originAccountId: multisigId,
      api,
      chain: polkadotChain,
    });
    const viaProxied = decodeDraftTransaction({
      callData: TRANSFER_CALL_DATA,
      originAccountId: proxiedId,
      api,
      chain: polkadotChain,
    });

    expect(viaProxied?.args?.dest).toBe(viaMultisig?.args?.dest);
    expect(viaProxied?.accountId).toBe(proxiedId);
  });

  it('rejects call data that does not round-trip even though the lenient decoder accepts it', () => {
    expect(api.createType('Call', TRUNCATED_CALL_DATA)).toBeDefined();

    expect(
      decodeDraftTransaction({ callData: TRUNCATED_CALL_DATA, originAccountId: multisigId, api, chain: polkadotChain }),
    ).toBeNull();
  });

  it('returns null when any input is missing', () => {
    expect(
      decodeDraftTransaction({ callData: null, originAccountId: multisigId, api, chain: polkadotChain }),
    ).toBeNull();
    expect(
      decodeDraftTransaction({ callData: TRANSFER_CALL_DATA, originAccountId: null, api, chain: polkadotChain }),
    ).toBeNull();
    expect(
      decodeDraftTransaction({
        callData: TRANSFER_CALL_DATA,
        originAccountId: multisigId,
        api: null,
        chain: polkadotChain,
      }),
    ).toBeNull();
    expect(
      decodeDraftTransaction({ callData: TRANSFER_CALL_DATA, originAccountId: multisigId, api, chain: null }),
    ).toBeNull();
  });
});

describe('getDraftOriginAccountId', () => {
  it('prefers the multisig and falls back to the proxied account', () => {
    expect(getDraftOriginAccountId(draft)).toBe(multisigId);
    expect(getDraftOriginAccountId({ ...draft, multisigAccountId: null, proxyAccountId: proxiedId })).toBe(proxiedId);
    expect(getDraftOriginAccountId({ ...draft, multisigAccountId: null, proxyAccountId: null })).toBeNull();
  });
});

describe('getPathOriginAccountId', () => {
  it('uses the innermost multisig hop, else the path root', () => {
    const nested: PathNode[] = [
      { kind: 'proxied', accountId: proxiedId },
      { kind: 'multisig', accountId: multisigId },
      { kind: 'signer', accountId: signerId },
    ];
    const proxyOnly: PathNode[] = [
      { kind: 'proxied', accountId: proxiedId },
      { kind: 'signer', accountId: signerId },
    ];

    expect(getPathOriginAccountId(nested)).toBe(multisigId);
    expect(getPathOriginAccountId(proxyOnly)).toBe(proxiedId);
    expect(getPathOriginAccountId([])).toBeNull();
  });
});
