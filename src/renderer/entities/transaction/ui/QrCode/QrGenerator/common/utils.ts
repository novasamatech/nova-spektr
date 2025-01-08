import { hexToU8a, u8aConcat, u8aToU8a } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import { str } from 'parity-scale-codec';
import qrcode from 'qrcode-generator';
import { type Encoder } from 'raptorq/raptorq';

import { type Address, type ChainId } from '@/shared/core';
import { CryptoType, CryptoTypeString, SigningType } from '@/shared/core';
import { DYNAMIC_DERIVATIONS_REQUEST } from '../../common/constants';
import { type DynamicDerivationRequestInfo } from '../../common/types';

import {
  CRYPTO_ECDSA,
  CRYPTO_ETHEREUM,
  CRYPTO_SR25519,
  CRYPTO_STUB,
  Command,
  FRAME_SIZE,
  SUBSTRATE_ID,
} from './constants';

const MULTIPART = new Uint8Array([0]);

// HACK The default function take string -> number[], the Uint8array is compatible
// with that signature and the use thereof
// @ts-expect-error hack
qrcode.stringToBytes = (data: Uint8Array): Uint8Array => data;

export const getSvgString = (value: Uint8Array, bgColor = 'none'): string => {
  const qr = qrcode(0, 'M');

  // This will only work for the case where we actually pass `Bytes` in here
  qr.addData(value as unknown as string, 'Byte');
  qr.make();

  const svgTag = qr.createSvgTag(2, 0);

  return svgTag
    .replace(/width="\d+px"/, 'width="100%"')
    .replace(/height="\d+px"/, 'height="100%"')
    .replace(/white/, bgColor);
};

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
    return createDynamicDerivationsSignPayload(
      address,
      Command.DynamicDerivationsTransaction,
      payload,
      genesisHash,
      derivationPath,
      cryptoType,
    );
  }

  return createSignPayload(address, Command.Transaction, payload, genesisHash, cryptoType);
};

export const createSignPayload = (
  address: string,
  cmd: number,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  return u8aConcat(
    isEthereum ? CRYPTO_ETHEREUM : CRYPTO_SR25519,
    new Uint8Array([cmd]),
    decodeAddress(address),
    u8aToU8a(payload),
    u8aToU8a(genesisHash),
  );
};

export const createDynamicDerivationsSignPayload = (
  address: string,
  cmd: number,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
  derivationPath: string,
  cryptoType = CryptoType.SR25519,
): Uint8Array => {
  return u8aConcat(
    cryptoType === CryptoType.SR25519 ? CRYPTO_SR25519 : CRYPTO_ECDSA,
    new Uint8Array([cmd]),
    decodeAddress(address),
    str.encode(derivationPath),
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
export const cryptoTypeToMultisignerIndex = (cryptoType: CryptoType): number => {
  return {
    [CryptoType.ED25519]: 0,
    [CryptoType.SR25519]: 1,
    [CryptoType.ECDSA]: 2,
    [CryptoType.ETHEREUM]: 3,
  }[cryptoType];
};

export const createDynamicDerivationPayload = (publicKey: Address, derivations: DynamicDerivationRequestInfo[]) => {
  const dynamicDerivationsRequest = DYNAMIC_DERIVATIONS_REQUEST.encode({
    DynamicDerivationsRequest: 'V1',
    payload: {
      multisigner: {
        MultiSigner: CryptoTypeString.SR25519,
        public: decodeAddress(publicKey, false, 1),
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
