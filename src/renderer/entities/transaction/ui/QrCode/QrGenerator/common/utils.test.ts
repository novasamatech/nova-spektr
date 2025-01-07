import { stringToU8a, u8aConcat, u8aToHex } from '@polkadot/util';

import { SigningType } from '@/shared/core';

import { SUBSTRATE_ID } from './constants';
import { createFrames, createSignPayload, createSubstrateSignPayload, encodeNumber, getSvgString } from './utils';

describe('QrCode/QrGenerator/onChainUtils', () => {
  test('should encodes 1 correctly', () => {
    expect(encodeNumber(1)).toEqual(new Uint8Array([0, 1]));
  });

  test('should encodes 257 correctly', () => {
    expect(encodeNumber(257)).toEqual(new Uint8Array([1, 1]));
  });

  test('should encodes a payload properly', () => {
    expect(
      u8aToHex(
        createSignPayload(
          '5HbgaJEuVN5qGbkhgtuDQANivSWwHXWsC2erP1SQUXgciTVq',
          3,
          'This is test',
          '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        ),
      ),
    ).toEqual(
      '0x' + // prefix
        '01' + // sr25519
        '03' + // sign tx
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // accountId
        '546869732069732074657374' + // This is test
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    );
  });

  test('should encodes frames properly', () => {
    expect(
      createFrames(
        u8aConcat(
          SUBSTRATE_ID,
          createSubstrateSignPayload(
            '5HbgaJEuVN5qGbkhgtuDQANivSWwHXWsC2erP1SQUXgciTVq',
            '0x12345678',
            '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
            SigningType.PARITY_SIGNER,
          ),
        ),
      ).map((u8a): string => u8aToHex(u8a)),
    ).toEqual([
      '0x' +
        '00' + // multipart
        '0001' + // length
        '0000' + // index
        '530100' + // payload info, substrate + sr25519 + signtx
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // accountId
        '12345678' + // data
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    ]);
  });

  test('should create svg string', () => {
    const svg = getSvgString(stringToU8a('test'), 'red');

    expect(svg).toMatch(/<svg version="1.1" xmlns="http:\/\/www.w3.org\/2000\/svg" width="100%" height="100%"/);
    expect(svg).toMatch(/<rect width="100%" height="100%" fill="red"/);
  });
});
