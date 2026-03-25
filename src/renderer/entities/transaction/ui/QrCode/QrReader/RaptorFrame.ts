import { QR_READER_DECODE_ERRORS } from '../common/errors';
import { DecodeQrError } from '../common/types';

const RAPTORQ_HEADER_SIZE = 4;

/**
 * Frame layout: [1-bit tag | 3-byte size (big-endian) | payload...]
 *
 * Previously used `binary-parser` which relies on `new Function()` (eval),
 * blocked by CSP `script-src` without `unsafe-eval`.
 */
function parseFrame(data: Uint8Array): { size: number; payload: Uint8Array } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // Bytes 1-3: transfer size as 24-bit big-endian unsigned int (byte 0 is tag, unused)
  const size = (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);

  return { size, payload: data.subarray(RAPTORQ_HEADER_SIZE) };
}

export class RaptorFrame {
  private readonly size: number;
  private readonly total: number;
  private readonly payload: Uint8Array;

  constructor(data: Uint8Array) {
    const result = parseFrame(data);

    if (result.payload.length === 0) {
      throw QR_READER_DECODE_ERRORS[DecodeQrError.NOT_RAPTOR_PACKAGE];
    }

    this.payload = result.payload;
    this.size = result.size;
    this.total =
      (this.payload.length == RAPTORQ_HEADER_SIZE
        ? 0
        : Math.trunc(this.size / (this.payload.length - RAPTORQ_HEADER_SIZE))) + 1;
  }

  get data() {
    return {
      size: this.size,
      total: this.total,
      payload: this.payload,
    };
  }
}
