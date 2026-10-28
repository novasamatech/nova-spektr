import { describe, expect, test } from 'vitest';

import { type DecodedTransaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
  buildEditControllerMarkerTx,
  parseEditControllerMarker,
} from '@/shared/transactions';
import { type MultisigOperation } from '@/domains/network';

import { parseProxyEditOperation } from './proxy-edit';

const oldController = '0x0101010101010101010101010101010101010101010101010101010101010101' as AccountId;
const newController = '0x0202020202020202020202020202020202020202020202020202020202020202' as AccountId;
const multisigAccountId = '0x0303030303030303030303030303030303030303030303030303030303030303' as AccountId;
const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as never;

const tx = (input: Partial<DecodedTransaction>): DecodedTransaction =>
  ({
    chainId,
    accountId: multisigAccountId,
    args: {},
    section: '',
    method: '',
    ...input,
  }) as DecodedTransaction;

const addProxy = (delegate: AccountId = newController) =>
  tx({
    section: 'proxy',
    method: 'addProxy',
    args: { delegate, proxyType: 'Any', delay: 0 },
  });

const removeProxy = (delegate: AccountId = oldController) =>
  tx({
    section: 'proxy',
    method: 'removeProxy',
    args: { delegate, proxyType: 'Any', delay: 0 },
  });

const remark = (payload: string) =>
  tx({
    section: 'system',
    method: 'remark',
    args: { remark: payload },
  });

const remarkWithEvent = (payload: string) =>
  tx({
    section: 'system',
    method: 'remarkWithEvent',
    args: { remark: payload },
  });

const batchAll = (transactions: DecodedTransaction[]) =>
  tx({
    section: 'utility',
    method: 'batchAll',
    args: { transactions },
  });

const operation = (transaction: DecodedTransaction | null): MultisigOperation =>
  ({
    id: 'op-1',
    status: 'pending',
    transaction,
    method: transaction?.method ?? null,
    section: transaction?.section ?? null,
    callHash: '0xdeadbeef',
    callData: null,
    chainId,
    multisigAccountId,
    depositor: oldController,
    blockCreated: 0,
    indexCreated: 0,
    events: [],
    timestamp: 0,
  }) as unknown as MultisigOperation;

const markerPayload = JSON.stringify({
  kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
  oldControllerAccountId: oldController,
});

describe('parseEditControllerMarker', () => {
  test('parses a well-formed marker payload', () => {
    expect(parseEditControllerMarker(markerPayload)).toEqual({
      kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
      oldControllerAccountId: oldController,
    });
  });

  test('parses a hex-encoded marker payload (on-chain decode shape)', () => {
    // `system.remark` args come back from the polkadot.js Bytes decoder as a 0x-prefixed
    // hex string. Convert the JSON string to its hex form and verify round-trip.
    const hex = '0x' + Buffer.from(markerPayload, 'utf8').toString('hex');
    expect(parseEditControllerMarker(hex)).toEqual({
      kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
      oldControllerAccountId: oldController,
    });
  });

  test('returns null for the new-controller metadata remark (different shape)', () => {
    const newCtrlMetadata = JSON.stringify({ signatories: [oldController], threshold: 1 });
    expect(parseEditControllerMarker(newCtrlMetadata)).toBeNull();
  });

  test('returns null for malformed JSON', () => {
    expect(parseEditControllerMarker('not json')).toBeNull();
  });

  test('returns null when kind field is wrong', () => {
    expect(
      parseEditControllerMarker(JSON.stringify({ kind: 'something-else', oldControllerAccountId: oldController })),
    ).toBeNull();
  });

  test('returns null when oldControllerAccountId is missing', () => {
    expect(parseEditControllerMarker(JSON.stringify({ kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND }))).toBeNull();
  });
});

describe('buildEditControllerMarkerTx', () => {
  test('produces a plain REMARK tx with stringified marker payload', () => {
    const built = buildEditControllerMarkerTx({
      chainId,
      accountId: oldController,
      oldControllerAccountId: oldController,
    });

    expect(built.type).toBe(TransactionType.REMARK);
    expect(built.chainId).toBe(chainId);
    expect(built.accountId).toBe(oldController);

    const decoded = parseEditControllerMarker(built.args['remark'] as string);
    expect(decoded).toEqual({
      kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
      oldControllerAccountId: oldController,
    });
  });
});

const proxied = (transaction: DecodedTransaction) =>
  tx({
    section: 'proxy',
    method: 'proxy',
    args: { real: oldController, forceProxyType: 'Any', transaction },
  });

const transfer = () =>
  tx({
    section: 'balances',
    method: 'transferKeepAlive',
    args: { dest: newController, value: '1' },
  });

describe('parseProxyEditOperation', () => {
  const newCtrlMetadata = JSON.stringify({ signatories: [newController], threshold: 1 });

  test('returns null for a bare addProxy (plain proxy add — not our flow)', () => {
    expect(parseProxyEditOperation(operation(addProxy()))).toBeNull();
  });

  test('returns null for null transaction', () => {
    expect(parseProxyEditOperation(operation(null))).toBeNull();
  });

  test('recognizes verified flow: proxy.proxy(batchAll([addProxy, marker remark]))', () => {
    const op = operation(proxied(batchAll([addProxy(), remark(markerPayload)])));
    expect(parseProxyEditOperation(op)).toEqual({
      newControllerAccountId: newController,
      oldControllerAccountId: oldController,
      proxyType: 'Any',
      isTrustedFlow: false,
    });
  });

  test('recognizes trusted flow: proxy.proxy(batchAll([addProxy, removeProxy])) — marker not required', () => {
    const op = operation(proxied(batchAll([addProxy(), removeProxy()])));
    expect(parseProxyEditOperation(op)).toEqual({
      newControllerAccountId: newController,
      oldControllerAccountId: oldController,
      proxyType: 'Any',
      isTrustedFlow: true,
    });
  });

  test('handles outer batchAll wrap (multisig-new path) for trusted flow', () => {
    // When the new-controller multisig isn't known locally, $coreTx wraps the proxy.proxy
    // in an outer batchAll with a metadata REMARK_WITH_EVENT in front.
    const op = operation(batchAll([remarkWithEvent(newCtrlMetadata), proxied(batchAll([addProxy(), removeProxy()]))]));
    expect(parseProxyEditOperation(op)).toMatchObject({
      newControllerAccountId: newController,
      oldControllerAccountId: oldController,
      isTrustedFlow: true,
    });
  });

  test('handles outer batchAll wrap (multisig-new path) for verified flow', () => {
    const op = operation(
      batchAll([remarkWithEvent(newCtrlMetadata), proxied(batchAll([addProxy(), remark(markerPayload)]))]),
    );
    expect(parseProxyEditOperation(op)).toMatchObject({
      newControllerAccountId: newController,
      oldControllerAccountId: oldController,
      isTrustedFlow: false,
    });
  });

  test('returns null for a bare batch without the proxy wrapper', () => {
    expect(parseProxyEditOperation(operation(batchAll([addProxy(), removeProxy()])))).toBeNull();
    expect(parseProxyEditOperation(operation(batchAll([addProxy(), remark(markerPayload)])))).toBeNull();
    expect(
      parseProxyEditOperation(operation(batchAll([remarkWithEvent(newCtrlMetadata), addProxy(), removeProxy()]))),
    ).toBeNull();
  });

  test('returns null for a reversed pair', () => {
    expect(parseProxyEditOperation(operation(proxied(batchAll([removeProxy(), addProxy()]))))).toBeNull();
    expect(parseProxyEditOperation(operation(proxied(batchAll([remark(markerPayload), addProxy()]))))).toBeNull();
  });

  test('returns null for a pair with an extra call', () => {
    expect(parseProxyEditOperation(operation(proxied(batchAll([addProxy(), removeProxy(), transfer()]))))).toBeNull();
    expect(parseProxyEditOperation(operation(proxied(batchAll([addProxy(), removeProxy(), addProxy()]))))).toBeNull();
    expect(
      parseProxyEditOperation(operation(proxied(batchAll([addProxy(), remark(markerPayload), transfer()])))),
    ).toBeNull();
  });

  test('returns null for an outer wrap with extra or reordered calls', () => {
    const edit = proxied(batchAll([addProxy(), removeProxy()]));

    expect(parseProxyEditOperation(operation(batchAll([edit])))).toBeNull();
    expect(parseProxyEditOperation(operation(batchAll([edit, remarkWithEvent(newCtrlMetadata)])))).toBeNull();
    expect(
      parseProxyEditOperation(operation(batchAll([remarkWithEvent(newCtrlMetadata), edit, transfer()]))),
    ).toBeNull();
  });

  test('returns null for a nested batch inside the pair', () => {
    const op = operation(proxied(batchAll([addProxy(), batchAll([removeProxy()])])));
    expect(parseProxyEditOperation(op)).toBeNull();
  });

  test('returns null for addProxy + non-marker remark', () => {
    const op = operation(proxied(batchAll([addProxy(), remark(JSON.stringify({ kind: 'unrelated' }))])));
    expect(parseProxyEditOperation(op)).toBeNull();
  });

  test('returns null for addProxy + REMARK_WITH_EVENT carrying marker payload (we accept plain remark only)', () => {
    const op = operation(proxied(batchAll([addProxy(), remarkWithEvent(markerPayload)])));
    expect(parseProxyEditOperation(op)).toBeNull();
  });

  test('returns null for a batch with no addProxy', () => {
    expect(parseProxyEditOperation(operation(proxied(batchAll([removeProxy()]))))).toBeNull();
    expect(parseProxyEditOperation(operation(proxied(batchAll([removeProxy(), removeProxy()]))))).toBeNull();
  });

  test('returns null for an unknown proxy type', () => {
    const weird = tx({
      section: 'proxy',
      method: 'addProxy',
      args: { delegate: newController, proxyType: 'Whatever', delay: 0 },
    });
    expect(parseProxyEditOperation(operation(proxied(batchAll([weird, removeProxy()]))))).toBeNull();
  });
});
