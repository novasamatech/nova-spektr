import { hexToU8a, u8aConcat, u8aToU8a } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import qrcode from 'qrcode-generator';
import { Encoder } from 'raptorq';

import { Command, CRYPTO_SR25519, CRYPTO_STUB, FRAME_SIZE, SUBSTRATE_ID } from './constants';
import type { ChainId } from '@renderer/shared/core';
import { Address, CryptoType, CryptoTypeString } from '@renderer/shared/core';
import { DYNAMIC_DERIVATIONS_REQUEST } from '@renderer/components/common/QrCode/common/constants';

const MULTIPART = new Uint8Array([0]);

// HACK The default function take string -> number[], the Uint8array is compatible
// with that signature and the use thereof
(qrcode as any).stringToBytes = (data: Uint8Array): Uint8Array => data;

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
  cmd: number,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
): Uint8Array => u8aConcat(SUBSTRATE_ID, createSignPayload(address, cmd, payload, genesisHash));

export const createSignPayload = (
  address: string,
  cmd: number,
  payload: string | Uint8Array,
  genesisHash: ChainId | Uint8Array,
): Uint8Array =>
  u8aConcat(CRYPTO_SR25519, new Uint8Array([cmd]), decodeAddress(address), u8aToU8a(payload), u8aToU8a(genesisHash));

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

export const createDynamicDerivationPayload = (
  publicKey: Address,
  derivations: { path: string; chainId: ChainId }[],
) => {
  const dynamicDerivationsRequest = DYNAMIC_DERIVATIONS_REQUEST.encode({
    DynamicDerivationsRequest: 'V1',
    payload: {
      multisigner: {
        MultiSigner: CryptoTypeString.SR25519,
        public: decodeAddress(publicKey),
      },
      dynamicDerivations: derivations.map((d) => ({
        derivationPath: d.path,
        genesisHash: hexToU8a('0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e'),
        encryption: CryptoType.SR25519,
      })),
    },
  });

  return u8aConcat(
    SUBSTRATE_ID,
    CRYPTO_STUB,
    new Uint8Array([0xdf]), // code 0xdf has to be moved to constants Command
    dynamicDerivationsRequest,
  );
};
