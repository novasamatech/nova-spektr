import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';

import { createExtrinsicPayload, createPayloadRegistry, signExtrinsicPayload } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { transactionService } from './service';

const { verifyPayloadSignature } = transactionService;

const toAccountId = (pair: KeyringPair): AccountId => {
  // ecdsa public keys are 33 bytes, the chain account id is their blake2 hash
  const accountId = pair.type === 'ecdsa' ? blake2AsU8a(pair.publicKey) : pair.publicKey;

  return u8aToHex(accountId) as AccountId;
};

describe('transactionService.verifyPayloadSignature', () => {
  let alice: KeyringPair;
  let bob: KeyringPair;
  let aliceEd25519: KeyringPair;
  let aliceEcdsa: KeyringPair;

  beforeAll(async () => {
    await cryptoWaitReady();
    alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
    bob = new Keyring({ type: 'sr25519' }).addFromUri('//Bob');
    aliceEd25519 = new Keyring({ type: 'ed25519' }).addFromUri('//Alice');
    aliceEcdsa = new Keyring({ type: 'ecdsa' }).addFromUri('//Alice');
  });

  it('the encoded payload itself is not what signers sign', () => {
    const { payload, signature } = signExtrinsicPayload(createExtrinsicPayload(createPayloadRegistry(), {}), alice);

    expect(signatureVerify(payload, signature, toAccountId(alice)).isValid).toBe(false);
  });

  it('accepts a bare 64-byte sr25519 signature', () => {
    const { payload, signature } = signExtrinsicPayload(createExtrinsicPayload(createPayloadRegistry(), {}), alice);

    expect(hexToU8a(signature)).toHaveLength(64);
    expect(verifyPayloadSignature(payload, signature, toAccountId(alice))).toBe(true);
  });

  it.each([
    ['< 64 bytes (1-byte length prefix)', 40],
    ['< 16384 bytes (2-byte length prefix, hashed)', 300],
    ['>= 16384 bytes (4-byte length prefix, hashed)', 20_000],
  ])('accepts a signature over a method %s', (_, methodLength) => {
    const { payload, signature } = signExtrinsicPayload(
      createExtrinsicPayload(createPayloadRegistry(), { methodLength }),
      alice,
    );

    expect(verifyPayloadSignature(payload, signature, toAccountId(alice))).toBe(true);
  });

  it('accepts a signature over a payload with metadata hash', () => {
    const { payload, signature } = signExtrinsicPayload(
      createExtrinsicPayload(createPayloadRegistry(true), { methodLength: 300, withMetadataHash: true }),
      alice,
    );

    expect(verifyPayloadSignature(payload, signature, toAccountId(alice))).toBe(true);
  });

  it('rejects a signature made by another account', () => {
    const { payload, signature } = signExtrinsicPayload(createExtrinsicPayload(createPayloadRegistry(), {}), bob);

    expect(verifyPayloadSignature(payload, signature, toAccountId(alice))).toBe(false);
  });

  it('rejects a signature over another payload', () => {
    const registry = createPayloadRegistry();
    const signed = signExtrinsicPayload(createExtrinsicPayload(registry, { nonce: 0 }), alice);
    const other = signExtrinsicPayload(createExtrinsicPayload(registry, { nonce: 1 }), alice);

    expect(verifyPayloadSignature(other.payload, signed.signature, toAccountId(alice))).toBe(false);
  });

  it('rejects garbage instead of throwing', () => {
    const { payload } = signExtrinsicPayload(createExtrinsicPayload(createPayloadRegistry(), {}), alice);

    expect(verifyPayloadSignature(payload, '0x1234', toAccountId(alice))).toBe(false);
  });

  describe('Polkadot Vault signature forms', () => {
    it.each([
      ['sr25519', () => alice, 1],
      ['ed25519', () => aliceEd25519, 0],
    ])('accepts a 65-byte type-prefixed %s signature', (_, getPair, typeIndex) => {
      const pair = getPair();
      const { payload, signature } = signExtrinsicPayload(
        createExtrinsicPayload(createPayloadRegistry(), { methodLength: 300 }),
        pair,
        true,
      );

      expect(hexToU8a(signature)).toHaveLength(65);
      expect(hexToU8a(signature)[0]).toBe(typeIndex);
      expect(verifyPayloadSignature(payload, signature, toAccountId(pair))).toBe(true);
    });

    it('rejects a type-prefixed signature of another account', () => {
      const { payload, signature } = signExtrinsicPayload(
        createExtrinsicPayload(createPayloadRegistry(), {}),
        bob,
        true,
      );

      expect(verifyPayloadSignature(payload, signature, toAccountId(alice))).toBe(false);
    });

    it('accepts a 66-byte type-prefixed ecdsa signature', () => {
      const { payload, signature } = signExtrinsicPayload(
        createExtrinsicPayload(createPayloadRegistry(), {}),
        aliceEcdsa,
        true,
      );

      expect(hexToU8a(signature)).toHaveLength(66);
      expect(verifyPayloadSignature(payload, signature, toAccountId(aliceEcdsa))).toBe(true);
    });

    it('accepts a bare 65-byte ecdsa signature (prefix stripped)', () => {
      const { payload, signature } = signExtrinsicPayload(
        createExtrinsicPayload(createPayloadRegistry(), { methodLength: 300 }),
        aliceEcdsa,
      );

      expect(hexToU8a(signature)).toHaveLength(65);
      expect(verifyPayloadSignature(payload, signature, toAccountId(aliceEcdsa))).toBe(true);
    });
  });
});
