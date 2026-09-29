import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { TypeRegistry } from '@polkadot/types';
import { type ExtrinsicPayload } from '@polkadot/types/interfaces';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { transactionService } from '@/entities/transaction';
import { operationSignUtils } from '../operation-sign-utils';

const ZERO_HASH = u8aToHex(new Uint8Array(32));

const createRegistry = (withMetadataHash = false) => {
  const registry = new TypeRegistry();

  if (withMetadataHash) {
    registry.setSignedExtensions([
      'CheckNonZeroSender',
      'CheckSpecVersion',
      'CheckTxVersion',
      'CheckGenesis',
      'CheckMortality',
      'CheckNonce',
      'CheckWeight',
      'ChargeTransactionPayment',
      'CheckMetadataHash',
    ]);
  }

  return registry;
};

const createPayload = (registry: TypeRegistry, methodLength: number, nonce = 0, withMetadataHash = false) => {
  return registry.createTypeUnsafe<ExtrinsicPayload>('ExtrinsicPayload', [
    {
      method: u8aToHex(new Uint8Array(methodLength).fill(7)),
      era: '0x00',
      nonce,
      tip: 0,
      specVersion: 1,
      transactionVersion: 1,
      genesisHash: ZERO_HASH,
      blockHash: ZERO_HASH,
      ...(withMetadataHash ? { mode: 1, metadataHash: u8aToHex(new Uint8Array(32).fill(1)) } : {}),
    },
    { version: 4 },
  ]);
};

const toAccountId = (pair: KeyringPair) => u8aToHex(pair.publicKey) as unknown as AccountId;

/** Mirrors what signers return and what the signing UIs pass on to `onResult`. */
const sign = (payload: ExtrinsicPayload, pair: KeyringPair) => ({
  payload: hexToU8a(payload.toHex()),
  signature: payload.sign(pair).signature as HexString,
});

describe('operationSignUtils signature verification', () => {
  let alice: KeyringPair;
  let bob: KeyringPair;

  beforeAll(async () => {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');
  });

  it('encoded payload with the method length prefix is not what the signer signed', () => {
    const { payload, signature } = sign(createPayload(createRegistry(), 40), alice);

    expect(transactionService.verifySignature(payload, signature, toAccountId(alice))).toBe(false);
  });

  describe('getSignedBytes', () => {
    it.each([
      ['< 64 bytes (1-byte prefix)', 40],
      ['< 16384 bytes (2-byte prefix)', 300],
      ['>= 16384 bytes (4-byte prefix)', 20_000],
    ])('matches toU8a({ method: true }) for method %s', (_, methodLength) => {
      const payload = createPayload(createRegistry(), methodLength);

      expect(operationSignUtils.getSignedBytes(hexToU8a(payload.toHex()))).toEqual(payload.toU8a({ method: true }));
    });

    it('matches toU8a({ method: true }) for a payload with metadata hash', () => {
      const payload = createPayload(createRegistry(true), 300, 0, true);

      expect(operationSignUtils.getSignedBytes(payload.toU8a(false))).toEqual(payload.toU8a({ method: true }));
    });
  });

  describe('verifySignatures', () => {
    it.each([40, 300, 20_000])('accepts a valid signature for method of %i bytes', (methodLength) => {
      const { payload, signature } = sign(createPayload(createRegistry(), methodLength), alice);

      expect(
        operationSignUtils.verifySignatures({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
        }),
      ).toBe(true);
    });

    it('accepts a valid signature over a payload with metadata hash', () => {
      const extrinsicPayload = createPayload(createRegistry(true), 300, 0, true);
      const signature = extrinsicPayload.sign(alice).signature as HexString;

      expect(
        operationSignUtils.verifySignatures({
          payloads: [extrinsicPayload.toU8a(false)],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
        }),
      ).toBe(true);
    });

    it('accepts a batch where every signature matches its payload and signer', () => {
      const registry = createRegistry();
      const signed = [
        sign(createPayload(registry, 40, 0), alice),
        sign(createPayload(registry, 20_000, 1), bob),
        sign(createPayload(registry, 300, 2), alice),
      ];

      expect(
        operationSignUtils.verifySignatures({
          payloads: signed.map((s) => s.payload),
          signatures: signed.map((s) => s.signature),
          accountIds: [toAccountId(alice), toAccountId(bob), toAccountId(alice)],
        }),
      ).toBe(true);
    });

    it('rejects a batch where one signature belongs to another payload', () => {
      const registry = createRegistry();
      const first = sign(createPayload(registry, 40, 0), alice);
      const second = sign(createPayload(registry, 40, 1), alice);

      expect(
        operationSignUtils.verifySignatures({
          payloads: [first.payload, second.payload],
          signatures: [first.signature, first.signature],
          accountIds: [toAccountId(alice), toAccountId(alice)],
        }),
      ).toBe(false);
    });

    it('rejects a signature made by another account', () => {
      const { payload, signature } = sign(createPayload(createRegistry(), 40), bob);

      expect(
        operationSignUtils.verifySignatures({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
        }),
      ).toBe(false);
    });

    it('rejects when the number of signatures does not match the number of payloads', () => {
      const registry = createRegistry();
      const first = sign(createPayload(registry, 40, 0), alice);
      const second = sign(createPayload(registry, 40, 1), alice);

      expect(
        operationSignUtils.verifySignatures({
          payloads: [first.payload, second.payload],
          signatures: [first.signature],
          accountIds: [toAccountId(alice), toAccountId(alice)],
        }),
      ).toBe(false);
    });

    it('rejects an empty response', () => {
      expect(operationSignUtils.verifySignatures({ payloads: [], signatures: [], accountIds: [] })).toBe(false);
    });
  });
});
