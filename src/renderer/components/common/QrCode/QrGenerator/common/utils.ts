import { u8aConcat, u8aToU8a } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';
import qrcode from 'qrcode-generator';

import { CRYPTO_SR25519, FRAME_SIZE, SUBSTRATE_ID } from './constants';

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

export const createSignPayload = (
  address: string,
  cmd: number,
  payload: string | Uint8Array,
  genesisHash: string | Uint8Array,
): Uint8Array =>
  u8aConcat(
    SUBSTRATE_ID,
    CRYPTO_SR25519,
    new Uint8Array([cmd]),
    decodeAddress(address),
    u8aToU8a(payload),
    u8aToU8a(genesisHash),
  );

export const createFrames = (input: Uint8Array): Uint8Array[] => {
  const frames = [];
  let idx = 0;

  while (idx < input.length) {
    frames.push(input.subarray(idx, idx + FRAME_SIZE));

    idx += FRAME_SIZE;
  }

  return frames.map(
    (frame, index): Uint8Array => u8aConcat(MULTIPART, encodeNumber(frames.length), encodeNumber(index), frame),
  );
};
