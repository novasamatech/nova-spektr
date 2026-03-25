import { QR_READER_DECODE_ERRORS } from '../common/errors';
import { DecodeQrError } from '../common/types';

import { RaptorFrame, parseFrame } from './RaptorFrame';

/**
 * Helper: build a raw RaptorQ frame from size + payload bytes.
 *
 * Layout: [tag (1 byte) | size high | size mid | size low | ...payload]
 */
function buildFrame(size: number, payload: number[]): Uint8Array {
  const tag = 0x00;
  const sizeHigh = (size >> 16) & 0xff;
  const sizeMid = (size >> 8) & 0xff;
  const sizeLow = size & 0xff;

  return new Uint8Array([tag, sizeHigh, sizeMid, sizeLow, ...payload]);
}

describe('parseFrame', () => {
  describe('size extraction', () => {
    test('parses size from bytes 1-3 as big-endian 24-bit uint', () => {
      const result = parseFrame(buildFrame(0x01f400, [1, 2, 3, 4]));

      expect(result.size).toBe(0x01f400);
    });

    test('parses zero size', () => {
      const result = parseFrame(buildFrame(0, [1]));

      expect(result.size).toBe(0);
    });

    test('parses max 24-bit size (0xFFFFFF)', () => {
      const result = parseFrame(buildFrame(0xffffff, [1]));

      expect(result.size).toBe(0xffffff);
    });

    test('parses size with only low byte set', () => {
      const result = parseFrame(buildFrame(0x42, [1]));

      expect(result.size).toBe(0x42);
    });

    test('parses size with only high byte set', () => {
      const result = parseFrame(buildFrame(0xab0000, [1]));

      expect(result.size).toBe(0xab0000);
    });
  });

  describe('payload extraction', () => {
    test('extracts payload starting from byte 4', () => {
      const payload = [0xde, 0xad, 0xbe, 0xef];
      const result = parseFrame(buildFrame(100, payload));

      expect(Array.from(result.payload)).toEqual(payload);
    });

    test('handles single-byte payload', () => {
      const result = parseFrame(buildFrame(100, [0xff]));

      expect(result.payload.length).toBe(1);
      expect(result.payload[0]).toBe(0xff);
    });

    test('handles large payload', () => {
      const payload = Array.from({ length: 512 }, (_, i) => i & 0xff);
      const result = parseFrame(buildFrame(10000, payload));

      expect(result.payload.length).toBe(512);
      expect(Array.from(result.payload)).toEqual(payload);
    });

    test('returns empty payload when frame has only header', () => {
      const headerOnly = new Uint8Array([0x00, 0x00, 0x01, 0x00]);
      const result = parseFrame(headerOnly);

      expect(result.payload.length).toBe(0);
    });
  });

  describe('tag byte is ignored', () => {
    test('different tag values produce the same size and payload', () => {
      const payload = [1, 2, 3, 4];
      const raw1 = buildFrame(1000, payload);
      const raw2 = buildFrame(1000, payload);
      raw1[0] = 0x00;
      raw2[0] = 0x80;

      const result1 = parseFrame(raw1);
      const result2 = parseFrame(raw2);

      expect(result1.size).toBe(result2.size);
      expect(Array.from(result1.payload)).toEqual(Array.from(result2.payload));
    });
  });

  describe('subarray offset handling', () => {
    test('works when Uint8Array is a view into a larger buffer', () => {
      const large = new Uint8Array([0xff, 0xff, ...buildFrame(0x000300, [0xaa, 0xbb]), 0xff]);
      const slice = large.subarray(2, 2 + 4 + 2);

      const result = parseFrame(slice);

      expect(result.size).toBe(0x000300);
      expect(Array.from(result.payload)).toEqual([0xaa, 0xbb]);
    });
  });
});

describe('RaptorFrame', () => {
  describe('total frames calculation', () => {
    test('single-frame QR (payload == RAPTORQ_HEADER_SIZE) returns total 1', () => {
      // payload length == 4 (RAPTORQ_HEADER_SIZE) → total = 0 + 1 = 1
      const frame = new RaptorFrame(buildFrame(100, [1, 2, 3, 4]));

      expect(frame.data.total).toBe(1);
    });

    test('calculates total for multi-frame transfer', () => {
      // size = 1000, payload = 8 bytes, effective = 8 - 4 = 4
      // total = Math.trunc(1000 / 4) + 1 = 251
      const frame = new RaptorFrame(buildFrame(1000, [1, 2, 3, 4, 5, 6, 7, 8]));

      expect(frame.data.total).toBe(251);
    });

    test('calculates total when size divides evenly', () => {
      // size = 100, payload = 24 bytes, effective = 24 - 4 = 20
      // total = Math.trunc(100 / 20) + 1 = 6
      const frame = new RaptorFrame(buildFrame(100, new Array(24).fill(0)));

      expect(frame.data.total).toBe(6);
    });

    test('calculates total with remainder', () => {
      // size = 101, payload = 24 bytes, effective = 24 - 4 = 20
      // total = Math.trunc(101 / 20) + 1 = 6
      const frame = new RaptorFrame(buildFrame(101, new Array(24).fill(0)));

      expect(frame.data.total).toBe(6);
    });
  });

  describe('error handling', () => {
    test('throws NOT_RAPTOR_PACKAGE when payload is empty (only header)', () => {
      const headerOnly = new Uint8Array([0x00, 0x00, 0x01, 0x00]);

      let thrown: unknown;
      try {
        new RaptorFrame(headerOnly);
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toEqual(QR_READER_DECODE_ERRORS[DecodeQrError.NOT_RAPTOR_PACKAGE]);
    });
  });
});
