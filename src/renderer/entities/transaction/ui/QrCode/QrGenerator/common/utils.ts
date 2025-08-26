import { hexToU8a, u8aConcat, u8aToU8a } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { str } from 'parity-scale-codec';
import { type Encoder } from 'raptorq/raptorq';

import {
  type Address,
  type Chain,
  type ChainId,
  SigningType,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { CryptoType, CryptoTypeString } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { DYNAMIC_DERIVATIONS_REQUEST, EXPORT_ADDRESS } from '../../common/constants';
import { type DynamicDerivationRequestInfo } from '../../common/types';

import { CRYPTO_STUB, Command, FRAME_SIZE, SUBSTRATE_ID } from './constants';

const MULTIPART = new Uint8Array([0]);

export const encodeNumber = (value: number): Uint8Array => new Uint8Array([value >> 8, value & 0xff]);

export const createSubstrateSignPayload = (
  address: string,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
  signingType: SigningType,
  derivationPath = '',
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  if (signingType === SigningType.POLKADOT_VAULT) {
    return createDynamicDerivationsSignPayload(address, payload, genesisHash, derivationPath, cryptoType);
  }

  return createSignPayload(address, payload, genesisHash, cryptoType);
};

export const createSignPayload = (
  address: string,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  return u8aConcat(
    new Uint8Array([cryptoTypeToMultisignerIndex(cryptoType)]),
    new Uint8Array([Command.Transaction]),
    decodeAddress(address),
    u8aToU8a(payload),
    u8aToU8a(genesisHash),
  );
};

export const createDynamicDerivationsSignPayload = (
  address: string,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
  derivationPath: string,
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  return u8aConcat(
    new Uint8Array([cryptoTypeToMultisignerIndex(cryptoType)]),
    new Uint8Array([Command.DynamicDerivationsTransaction]),
    decodeAddress(address),
    str.encode(derivationPath),
    u8aToU8a(payload),
    u8aToU8a(genesisHash),
  );
};

export const createSubstrateSignWithProofPayload = (
  address: string,
  metadataProof: Uint8Array,
  payload: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  signingType: SigningType,
  derivationPath = '',
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  if (signingType === SigningType.POLKADOT_VAULT) {
    return createDynamicDerivationsSignWithProofPayload(
      address,
      metadataProof,
      payload,
      genesisHash,
      derivationPath,
      cryptoType,
    );
  }

  return createSignWithProofPayload(address, metadataProof, payload, genesisHash, cryptoType);
};

export const createSignWithProofPayload = (
  address: string,
  metadataProof: Uint8Array,
  payload: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  return u8aConcat(
    new Uint8Array([cryptoTypeToMultisignerIndex(cryptoType)]),
    new Uint8Array([Command.TransactionWithProof]),
    decodeAddress(address),
    u8aToU8a(metadataProof),
    u8aToU8a(payload),
    u8aToU8a(genesisHash),
  );
};

export const createDynamicDerivationsSignWithProofPayload = (
  address: string,
  metadataProof: Uint8Array,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
  derivationPath: string,
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  return u8aConcat(
    new Uint8Array([cryptoTypeToMultisignerIndex(cryptoType)]),
    new Uint8Array([Command.DynamicDerivationsTransactionWithProof]),
    decodeAddress(address),
    str.encode(derivationPath),
    u8aToU8a(metadataProof),
    u8aToU8a(payload),
    u8aToU8a(genesisHash),
  );
};

export const createMultipleSignPayload = (transactions: Uint8Array): Uint8Array => {
  return u8aConcat(SUBSTRATE_ID, CRYPTO_STUB, new Uint8Array([Command.MultipleTransactions]), transactions);
};

export const createFrames = (input: Uint8Array, encoder?: Encoder): Uint8Array[] => {
  if (encoder) {
    // raptorq encoder https://paritytech.github.io/parity-signer/development/UOS.html#raptorq-multipart-payload
    return encoder.encode_with_packet_size(Math.trunc(input.length / 128));
  }

  // legacy encoder https://paritytech.github.io/parity-signer/development/UOS.html#legacy-multipart-payload
  let index = 0;
  const frames = [];
  while (index < input.length) {
    frames.push(input.subarray(index, index + FRAME_SIZE));

    index += FRAME_SIZE;
  }

  return frames.map(
    (frame, index): Uint8Array => u8aConcat(MULTIPART, encodeNumber(frames.length), encodeNumber(index), frame),
  );
};

/**
 * CryptoType enum indexes are different from MULTI_SIGNER taggedUnion fields
 * order MULTI_SIGNER can't be changed and changing CryptoType would require DB
 * migration
 *
 * @param cryptoType Crypto type
 *
 * @returns {Number}
 */
export const cryptoTypeToMultisignerIndex = (cryptoType: CryptoType | CryptoTypeString): number => {
  return {
    [CryptoType.ED25519]: 0,
    [CryptoType.SR25519]: 1,
    [CryptoType.ECDSA]: 2,
    [CryptoType.ETHEREUM]: 3,

    [CryptoTypeString.ED25519]: 0,
    [CryptoTypeString.SR25519]: 1,
    [CryptoTypeString.ECDSA]: 2,
    [CryptoTypeString.ETHEREUM]: 3,
  }[cryptoType];
};

export const createDynamicDerivationPayload = (publicKey: Address, derivations: DynamicDerivationRequestInfo[]) => {
  const dynamicDerivationsRequest = DYNAMIC_DERIVATIONS_REQUEST.encode({
    DynamicDerivationsRequest: 'V1',
    payload: {
      multisigner: {
        MultiSigner: CryptoTypeString.SR25519,
        public: decodeAddress(publicKey),
      },
      dynamicDerivations: derivations.map((d) => ({
        derivationPath: d.derivationPath,
        genesisHash: hexToU8a(d.genesisHash),
        encryption: cryptoTypeToMultisignerIndex(d.encryption),
      })),
    },
  });

  return u8aConcat(
    SUBSTRATE_ID,
    CRYPTO_STUB,
    new Uint8Array([Command.DynamicDerivationsRequestV1]),
    dynamicDerivationsRequest,
  );
};

export const createDynamicDerivationExportPayload = (
  walletName: string,
  publicKey: Address,
  derivations: (VaultChainAccount | VaultShardAccount)[],
  chains: Record<ChainId, Chain>,
) => {
  const payload = EXPORT_ADDRESS.encode({
    ExportAddrs: 'V1',
    payload: [
      {
        name: walletName,
        multiSigner: {
          MultiSigner: CryptoTypeString.SR25519,
          public: decodeAddress(publicKey),
        },
        derivedKeys: derivations
          .map((d) => {
            const chain = chains[d.chainId];
            const address =
              d.cryptoType === CryptoType.ETHEREUM
                ? (d.publicKey ?? null)
                : chain
                  ? encodeAddress(d.accountId, chain.addressPrefix)
                  : null;

            if (nullable(address)) return null;

            return {
              address,
              derivationPath: d.derivationPath,
              genesisHash: hexToU8a(d.chainId),
              encryption: cryptoTypeToMultisignerIndex(d.cryptoType),
            };
          })
          .filter(nonNullable),
      },
    ],
  });

  return u8aConcat(SUBSTRATE_ID, CRYPTO_STUB, new Uint8Array([Command.DynamicDerivationsExport]), payload);
};
