import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, cryptoWaitReady } from '@polkadot/util-crypto';

import { ValidationErrors } from '@/shared/lib/utils';
import { createExtrinsicPayload, createPayloadRegistry, signExtrinsicPayload } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { operationSignUtils } from '../operation-sign-utils';

const toAccountId = (pair: KeyringPair): AccountId => {
  const accountId = pair.type === 'ecdsa' ? blake2AsU8a(pair.publicKey) : pair.publicKey;

  return u8aToHex(accountId) as AccountId;
};

describe('operationSignUtils signature verification', () => {
  const registry = createPayloadRegistry();

  let alice: KeyringPair;
  let bob: KeyringPair;
  let aliceEd25519: KeyringPair;
  let aliceEcdsa: KeyringPair;

  const sign = (pair: KeyringPair, methodLength: number, nonce: number, withType = false) => {
    return signExtrinsicPayload(createExtrinsicPayload(registry, { methodLength, nonce }), pair, withType);
  };

  beforeAll(async () => {
    await cryptoWaitReady();
    alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
    bob = new Keyring({ type: 'sr25519' }).addFromUri('//Bob');
    aliceEd25519 = new Keyring({ type: 'ed25519' }).addFromUri('//Alice');
    aliceEcdsa = new Keyring({ type: 'ecdsa' }).addFromUri('//Alice');
  });

  describe('verifySignatures', () => {
    it('accepts a batch where every signature matches its payload and signer', () => {
      const signed = [sign(alice, 40, 0), sign(bob, 20_000, 1), sign(alice, 300, 2)];

      expect(
        operationSignUtils.verifySignatures({
          payloads: signed.map((s) => s.payload),
          signatures: signed.map((s) => s.signature),
          accountIds: [toAccountId(alice), toAccountId(bob), toAccountId(alice)],
        }),
      ).toBe(true);
    });

    it('rejects a batch where one signature belongs to another payload', () => {
      const first = sign(alice, 40, 0);
      const second = sign(alice, 40, 1);

      expect(
        operationSignUtils.verifySignatures({
          payloads: [first.payload, second.payload],
          signatures: [first.signature, first.signature],
          accountIds: [toAccountId(alice), toAccountId(alice)],
        }),
      ).toBe(false);
    });

    it('rejects a signature made by another account', () => {
      const { payload, signature } = sign(bob, 40, 0);

      expect(
        operationSignUtils.verifySignatures({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
        }),
      ).toBe(false);
    });

    it('rejects when the number of signatures does not match the number of payloads', () => {
      const first = sign(alice, 40, 0);
      const second = sign(alice, 40, 1);

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

    describe('Polkadot Vault multi-frame signatures', () => {
      it('accepts type-prefixed sr25519 and ed25519 signatures after transformEcdsaSignature', () => {
        const signed = [sign(alice, 40, 0, true), sign(aliceEd25519, 300, 1, true), sign(alice, 20_000, 2, true)];
        const signatures = signed.map((s) => operationSignUtils.transformEcdsaSignature(s.signature));

        // 65-byte signatures are not touched by the ECDSA transform
        expect(signatures).toEqual(signed.map((s) => s.signature));
        expect(signatures.map((s) => hexToU8a(s).length)).toEqual([65, 65, 65]);
        expect(
          operationSignUtils.verifySignatures({
            payloads: signed.map((s) => s.payload),
            signatures,
            accountIds: [toAccountId(alice), toAccountId(aliceEd25519), toAccountId(alice)],
          }),
        ).toBe(true);
      });

      it('accepts a 66-byte ecdsa signature cut to 65 bytes by transformEcdsaSignature', () => {
        const signed = [sign(aliceEcdsa, 40, 0, true), sign(aliceEcdsa, 300, 1, true)];
        const signatures = signed.map((s) => operationSignUtils.transformEcdsaSignature(s.signature));

        expect(signed.map((s) => hexToU8a(s.signature).length)).toEqual([66, 66]);
        expect(signatures.map((s) => hexToU8a(s).length)).toEqual([65, 65]);
        expect(
          operationSignUtils.verifySignatures({
            payloads: signed.map((s) => s.payload),
            signatures,
            accountIds: [toAccountId(aliceEcdsa), toAccountId(aliceEcdsa)],
          }),
        ).toBe(true);
      });

      it('rejects a type-prefixed signature over another payload of the batch', () => {
        const first = sign(alice, 40, 0, true);
        const second = sign(alice, 40, 1, true);

        expect(
          operationSignUtils.verifySignatures({
            payloads: [first.payload, second.payload],
            signatures: [first.signature, first.signature],
            accountIds: [toAccountId(alice), toAccountId(alice)],
          }),
        ).toBe(false);
      });
    });
  });

  describe('validateSignedResponse', () => {
    it('returns null for valid signatures and a covered balance', async () => {
      const { payload, signature } = sign(alice, 40, 0);
      const validateBalance = vi.fn(async () => undefined);

      await expect(
        operationSignUtils.validateSignedResponse({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
          validateBalance,
        }),
      ).resolves.toBeNull();
      expect(validateBalance).toHaveBeenCalledTimes(1);
    });

    it('reports an invalid signature without checking the balance', async () => {
      const { payload, signature } = sign(bob, 40, 0);
      const validateBalance = vi.fn(async () => ValidationErrors.INSUFFICIENT_BALANCE);

      await expect(
        operationSignUtils.validateSignedResponse({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
          validateBalance,
        }),
      ).resolves.toBe(ValidationErrors.INVALID_SIGNATURE);
      expect(validateBalance).not.toHaveBeenCalled();
    });

    it('reports the balance error for valid signatures', async () => {
      const { payload, signature } = sign(alice, 40, 0);

      await expect(
        operationSignUtils.validateSignedResponse({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
          validateBalance: async () => ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE,
        }),
      ).resolves.toBe(ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);
    });

    it('accepts valid signatures when there is no balance check', async () => {
      const { payload, signature } = sign(alice, 40, 0);

      await expect(
        operationSignUtils.validateSignedResponse({
          payloads: [payload],
          signatures: [signature],
          accountIds: [toAccountId(alice)],
        }),
      ).resolves.toBeNull();
    });
  });
});
