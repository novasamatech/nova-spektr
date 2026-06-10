import { describe, expect, test } from 'vitest';

import { type DecodedTransaction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { VERIFY_PROXY_REMARK_KIND } from '@/shared/transactions';
import { type MultisigOperation } from '@/domains/network';

import { parseVerifyProxyOperation } from './verify-proxy-op';

const delegate = '0x14f0c4e9195004ab0be6fe37c18f430e2a1a8e922e7f8fee11d131d9fd29b878' as AccountId;
const pureProxy = '0x7191b20040672e46e84c0ccc857b574c54c44f97607aaf9128e988b5049b4ad0' as AccountId;
const someoneElse = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as AccountId;
const chainId = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f' as never;

const tx = (input: Partial<DecodedTransaction>): DecodedTransaction =>
  ({
    chainId,
    accountId: delegate,
    args: {},
    section: '',
    method: '',
    ...input,
  }) as DecodedTransaction;

const remarkWithEvent = (payload: string) =>
  tx({
    section: 'system',
    method: 'remarkWithEvent',
    args: { remark: payload },
  });

const proxyWrap = (inner: DecodedTransaction) =>
  tx({
    section: 'proxy',
    method: 'proxy',
    args: { real: pureProxy, forceProxyType: 'Any', transaction: inner },
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
    multisigAccountId: delegate,
    depositor: delegate,
    blockCreated: 0,
    indexCreated: 0,
    events: [],
    timestamp: 0,
  }) as unknown as MultisigOperation;

const markerPayload = JSON.stringify({
  kind: VERIFY_PROXY_REMARK_KIND,
  delegateAccountId: delegate,
  pureProxyAccountId: pureProxy,
});

const toHex = (s: string) => '0x' + Buffer.from(s, 'utf8').toString('hex');

describe('parseVerifyProxyOperation', () => {
  test('recognizes proxy.proxy(call=remarkWithEvent(verify-proxy marker))', () => {
    const op = operation(proxyWrap(remarkWithEvent(markerPayload)));
    expect(parseVerifyProxyOperation(op)).toEqual({
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
    });
  });

  test('recognizes the on-chain hex-encoded remark form', () => {
    const op = operation(proxyWrap(remarkWithEvent(toHex(markerPayload))));
    expect(parseVerifyProxyOperation(op)).toEqual({
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
    });
  });

  test('returns null for plain system.remark (different method)', () => {
    const inner = tx({
      section: 'system',
      method: 'remark',
      args: { remark: markerPayload },
    });
    expect(parseVerifyProxyOperation(operation(proxyWrap(inner)))).toBeNull();
  });

  test('returns null for remarkWithEvent without proxy wrap (out of expected shape)', () => {
    expect(parseVerifyProxyOperation(operation(remarkWithEvent(markerPayload)))).toBeNull();
  });

  test('returns null when remark JSON has wrong kind', () => {
    const wrongKind = JSON.stringify({
      kind: 'something-else',
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
    });
    expect(parseVerifyProxyOperation(operation(proxyWrap(remarkWithEvent(wrongKind))))).toBeNull();
  });

  test('returns null when marker payload is malformed JSON', () => {
    expect(parseVerifyProxyOperation(operation(proxyWrap(remarkWithEvent('not json'))))).toBeNull();
  });

  test('returns null for null transaction', () => {
    expect(parseVerifyProxyOperation(operation(null))).toBeNull();
  });

  test('passes through marker AccountIds verbatim, ignoring operation.multisigAccountId', () => {
    // The marker is the only source of truth for delegate/pure; differences in the
    // operation's multisigAccountId must not bleed into the parser output.
    const op: MultisigOperation = {
      ...operation(proxyWrap(remarkWithEvent(markerPayload))),
      multisigAccountId: someoneElse,
    } as MultisigOperation;
    expect(parseVerifyProxyOperation(op)).toEqual({
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
    });
  });

  test('returns remark text when present in the marker payload', () => {
    const payloadWithRemark = JSON.stringify({
      kind: VERIFY_PROXY_REMARK_KIND,
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      remark: 'Q1 audit sign-off',
    });
    const op = operation(proxyWrap(remarkWithEvent(payloadWithRemark)));
    expect(parseVerifyProxyOperation(op)).toEqual({
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      remark: 'Q1 audit sign-off',
    });
  });

  test('returns remark text from the legacy `memo` key', () => {
    const legacyPayload = JSON.stringify({
      kind: VERIFY_PROXY_REMARK_KIND,
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      memo: 'Q1 audit sign-off',
    });
    const op = operation(proxyWrap(remarkWithEvent(legacyPayload)));
    expect(parseVerifyProxyOperation(op)).toEqual({
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      remark: 'Q1 audit sign-off',
    });
  });

  test('returns remark text when verify-proxy call is nested in a batch', () => {
    const payloadWithRemark = JSON.stringify({
      kind: VERIFY_PROXY_REMARK_KIND,
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      remark: 'Q1 audit sign-off',
    });
    const op = operation(batchAll([proxyWrap(remarkWithEvent(payloadWithRemark))]));

    expect(parseVerifyProxyOperation(op)).toEqual({
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      remark: 'Q1 audit sign-off',
    });
  });

  test('returns no remark property when remark is absent from marker payload', () => {
    const op = operation(proxyWrap(remarkWithEvent(markerPayload)));
    const result = parseVerifyProxyOperation(op);
    expect(result).not.toBeNull();
    expect('remark' in result!).toBe(false);
  });

  test('ignores empty-string remark in marker payload', () => {
    const payloadEmptyRemark = JSON.stringify({
      kind: VERIFY_PROXY_REMARK_KIND,
      delegateAccountId: delegate,
      pureProxyAccountId: pureProxy,
      remark: '',
    });
    const op = operation(proxyWrap(remarkWithEvent(payloadEmptyRemark)));
    const result = parseVerifyProxyOperation(op);
    expect(result).not.toBeNull();
    expect('remark' in result!).toBe(false);
  });
});
