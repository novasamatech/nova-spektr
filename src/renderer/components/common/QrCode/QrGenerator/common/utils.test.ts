import { stringToU8a, u8aToHex } from '@polkadot/util';

import { createFrames, createSignPayload, encodeNumber, getSvgString } from './utils';

describe('QrCode/QrGenerator/utils', () => {
  test('should encodes 1 correctly', () => {
    expect(encodeNumber(1)).toEqual(new Uint8Array([0, 1]));
  });

  test('should encodes 257 correctly', () => {
    expect(encodeNumber(257)).toEqual(new Uint8Array([1, 1]));
  });

  test('should encodes a payload properly', () => {
    console.log(
      createSignPayload(
        '5Dc1tzx4QDEDXetr98Mk4RjKSMFJiLBqr2Gmco7rjz8YfwMP',
        3,
        'This is test',
        '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
      ),
    );
    expect(
      u8aToHex(
        createSignPayload(
          '5Dc1tzx4QDEDXetr98Mk4RjKSMFJiLBqr2Gmco7rjz8YfwMP',
          3,
          'This is test',
          '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
        ),
      ),
    ).toEqual(
      '0x' + // prefix
        '53' + // substrate
        '01' + // sr25519
        '03' + // sign tx
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // publickey
        '546869732069732074657374' + // This is test
        'b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // genesisHash
    );
  });

  test('should encodes frames properly', () => {
    expect(
      createFrames(
        createSignPayload(
          '5HbgaJEuVN5qGbkhgtuDQANivSWwHXWsC2erP1SQUXgciTVq',
          0,
          '0x12345678',
          '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        ),
      ).map((u8a): string => u8aToHex(u8a)),
    ).toEqual([
      '0x' +
        '00' + // multipart
        '0001' + // length
        '0000' + // index
        '530100' + // payload info, substrate + sr25519 + signtx
        'f4cd755672a8f9542ca9da4fbf2182e79135d94304002e6a09ffc96fef6e6c4c' + // publicKey
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
