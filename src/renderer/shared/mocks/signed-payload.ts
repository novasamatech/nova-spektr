import { type KeyringPair } from '@polkadot/keyring/types';
import { TypeRegistry } from '@polkadot/types';
import { type ExtrinsicPayload } from '@polkadot/types/interfaces';
import { type Registry } from '@polkadot/types/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a } from '@polkadot/util-crypto';

import { type HexString } from '@/shared/core';

const ZERO_HASH = u8aToHex(new Uint8Array(32));

const METADATA_HASH_EXTENSIONS = [
  'CheckNonZeroSender',
  'CheckSpecVersion',
  'CheckTxVersion',
  'CheckGenesis',
  'CheckMortality',
  'CheckNonce',
  'CheckWeight',
  'ChargeTransactionPayment',
  'CheckMetadataHash',
];

/**
 * Metadata-less registry; `withMetadataHash` adds the `CheckMetadataHash`
 * signed extension.
 */
export const createPayloadRegistry = (withMetadataHash = false) => {
  const registry = new TypeRegistry();

  if (withMetadataHash) {
    registry.setSignedExtensions(METADATA_HASH_EXTENSIONS);
  }

  return registry;
};

type ExtrinsicPayloadParams = {
  /** Call data, or a filler call of `methodLength` bytes. */
  method?: HexString;
  methodLength?: number;
  nonce?: number;
  genesisHash?: HexString;
  withMetadataHash?: boolean;
  version?: number;
};

export const createExtrinsicPayload = (
  registry: Registry,
  {
    method,
    methodLength = 40,
    nonce = 0,
    genesisHash = ZERO_HASH,
    withMetadataHash,
    version = 4,
  }: ExtrinsicPayloadParams,
) => {
  return registry.createTypeUnsafe<ExtrinsicPayload>('ExtrinsicPayload', [
    {
      method: method ?? u8aToHex(new Uint8Array(methodLength).fill(7)),
      era: '0x00',
      nonce,
      tip: 0,
      specVersion: 1,
      transactionVersion: 1,
      genesisHash,
      blockHash: genesisHash,
      ...(withMetadataHash ? { mode: 1, metadataHash: u8aToHex(new Uint8Array(32).fill(1)) } : {}),
    },
    { version },
  ]);
};

/**
 * What a signer hands back and what the signing UIs pass on to `onResult`: the
 * encoded `ExtrinsicPayload` (with the method length prefix) and the signature
 * made over it. Signs explicitly instead of `payload.sign(pair)`, whose type
 * prefix depends on the registry: a bare signature by default, or one prefixed
 * with the `MultiSignature` type byte (`withType`) like Polkadot Vault's
 * multi-frame signature QR (65 bytes for sr25519/ed25519, 66 for ecdsa).
 */
export const signExtrinsicPayload = (payload: ExtrinsicPayload, pair: KeyringPair, withType = false) => {
  const signedBytes = payload.toU8a({ method: true });
  const message = signedBytes.length > 256 ? blake2AsU8a(signedBytes) : signedBytes;

  return {
    payload: hexToU8a(payload.toHex()),
    signature: u8aToHex(pair.sign(message, { withType })),
  };
};
