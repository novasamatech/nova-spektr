import { hexToU8a, u8aConcat, u8aToU8a } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { str } from 'parity-scale-codec';
import { type Encoder } from 'raptorq/raptorq';

import {
  type Address,
  type Chain,
  type ChainId,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
} from '@/shared/core';
import { CryptoType, CryptoTypeString } from '@/shared/core';
import { RelayChains, nonNullable, nullable } from '@/shared/lib/utils';
import { DYNAMIC_DERIVATIONS_REQUEST, EXPORT_ADDRESS } from '../../common/constants';
import { type DynamicDerivationRequestInfo } from '../../common/types';

import { CRYPTO_STUB, Command, FRAME_SIZE, SUBSTRATE_ID } from './constants';

const MULTIPART = new Uint8Array([0]);

export const encodeNumber = (value: number): Uint8Array => new Uint8Array([value >> 8, value & 0xff]);

const createSignPayload = (
  command: Command,
  address: string,
  genesisHash: ChainId | Uint8Array,
  cryptoType: CryptoType,
  ...data: Uint8Array[]
): Uint8Array => {
  return u8aConcat(
    new Uint8Array([cryptoTypeToMultisignerIndex(cryptoType)]),
    new Uint8Array([command]),
    decodeAddress(address),
    ...data,
    u8aToU8a(genesisHash),
  );
};

export const createMessageSignPayload = (
  address: string,
  message: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  cryptoType: CryptoType,
): Uint8Array => {
  return createSignPayload(Command.Message, address, genesisHash, cryptoType, message);
};

export const createTransactionPayload = (
  address: string,
  payload: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  cryptoType: CryptoType,
): Uint8Array => {
  return createSignPayload(Command.Transaction, address, genesisHash, cryptoType, u8aToU8a(payload));
};

export const createSignWithProofPayload = (
  address: string,
  metadataProof: Uint8Array,
  payload: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  cryptoType: CryptoType,
): Uint8Array => {
  return createSignPayload(
    Command.TransactionWithProof,
    address,
    genesisHash,
    cryptoType,
    u8aToU8a(metadataProof),
    u8aToU8a(payload),
  );
};

export const createDynamicDerivationsSignPayload = (
  rootAccountId: string,
  payload: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  derivationPath: string,
  cryptoType: CryptoType,
): Uint8Array => {
  return createSignPayload(
    Command.DynamicDerivationsTransaction,
    rootAccountId,
    genesisHash,
    cryptoType,
    str.encode(derivationPath),
    u8aToU8a(payload),
  );
};

export const createDynamicDerivationsSignWithProofPayload = (
  rootAccountId: string,
  metadataProof: Uint8Array,
  payload: Uint8Array,
  genesisHash: ChainId | Uint8Array,
  derivationPath: string,
  cryptoType: CryptoType,
): Uint8Array => {
  return createSignPayload(
    Command.DynamicDerivationsTransactionWithProof,
    rootAccountId,
    genesisHash,
    cryptoType,
    str.encode(derivationPath),
    u8aToU8a(metadataProof),
    u8aToU8a(payload),
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
  derivations: (VaultChainAccount | VaultShardAccount | VaultUniversalKeyAccount)[],
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
            // A key with no network scope goes to the device under Polkadot relay
            // — the network every key set already has. The public key is the same
            // whichever network it is filed under.
            const chainId = 'chainId' in d ? d.chainId : RelayChains.POLKADOT;
            const chain = chains[chainId];
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
              genesisHash: hexToU8a(chainId),
              encryption: cryptoTypeToMultisignerIndex(d.cryptoType),
            };
          })
          .filter(nonNullable),
      },
    ],
  });

  return u8aConcat(SUBSTRATE_ID, CRYPTO_STUB, new Uint8Array([Command.DynamicDerivationsExport]), payload);
};
