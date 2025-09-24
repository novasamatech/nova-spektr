import { hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util';

import { CryptoType } from '@/shared/core';

import { SUBSTRATE_ID } from './constants';
import {
  createDynamicDerivationsSignPayload,
  createDynamicDerivationsSignWithProofPayload,
  createFrames,
  createSignPayload,
  createSignWithProofPayload,
  encodeNumber,
} from './utils';

describe('QrCode/QrGenerator/onChainUtils', () => {
  test('should encodes 1 correctly', () => {
    expect(encodeNumber(1)).toEqual(new Uint8Array([0, 1]));
  });

  test('should encodes 257 correctly', () => {
    expect(encodeNumber(257)).toEqual(new Uint8Array([1, 1]));
  });

  test('should encode a payload properly', () => {
    expect(
      u8aToHex(
        createSignPayload(
          '5HbgaJEuVN5qGbkhgtuDQANivSWwHXWsC2erP1SQUXgciTVq',
          hexToU8a('0x12345678'),
          '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
          CryptoType.SR25519,
        ),
      ),
    ).toEqual(
      '0x' + // prefix
        '01' + // sr25519
        '00' + // sign tx
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // accountId
        '12345678' + // payload
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    );
  });

  test('should encode a dynamic derivation payload properly', () => {
    expect(
      u8aToHex(
        createDynamicDerivationsSignPayload(
          '0xf4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c',
          hexToU8a('0x12345678'),
          '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
          '//westend',
          CryptoType.SR25519,
        ),
      ),
    ).toEqual(
      '0x' + // prefix
        '01' + // sr25519
        '05' + // sign dd tx
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // accountId
        '242f2f77657374656e64' + // derivation path
        '12345678' + // payload
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    );
  });

  test('should encode a payload with proof properly', () => {
    expect(
      u8aToHex(
        createSignWithProofPayload(
          '5HbgaJEuVN5qGbkhgtuDQANivSWwHXWsC2erP1SQUXgciTVq',
          hexToU8a('0xdeadbeef'),
          hexToU8a('0x12345678'),
          '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
          CryptoType.SR25519,
        ),
      ),
    ).toEqual(
      '0x' + // prefix
        '01' + // sr25519
        '06' + // sign tx with proof
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // accountId
        'deadbeef' + // metadata proof
        '12345678' + // payload
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    );
  });

  test('should encode a dynamic derivation payload with proof properly', () => {
    expect(
      u8aToHex(
        createDynamicDerivationsSignWithProofPayload(
          '0xf4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c',
          hexToU8a('0xdeadbeef'),
          hexToU8a('0x12345678'),
          '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
          '//westend',
          CryptoType.SR25519,
        ),
      ),
    ).toEqual(
      '0x' + // prefix
        '01' + // sr25519
        '07' + // sign dd tx with proof
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // accountId
        '242f2f77657374656e64' + // derivation path
        'deadbeef' + // metadata proof
        '12345678' + // payload
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    );
  });

  test('should encode frames properly', () => {
    expect(
      createFrames(
        u8aConcat(
          SUBSTRATE_ID,
          createSignPayload(
            '5HbgaJEuVN5qGbkhgtuDQANivSWwHXWsC2erP1SQUXgciTVq',
            hexToU8a('0x12345678'),
            '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
            CryptoType.SR25519,
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
});
