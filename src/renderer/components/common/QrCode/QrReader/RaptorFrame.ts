import { u8aToHex } from '@polkadot/util';
import { Parser } from 'binary-parser';

import { QR_READER_ERRORS } from '../common/errors';
import { QrError } from '../common/types';

const RAPTORQ_HEADER_SIZE = 4;

class RaptorFrame {
  private readonly size: number;
  private readonly total: number;
  private readonly payload: Uint8Array;

  constructor(data: Uint8Array) {
    const result = new Parser()
      .bit1('tag')
      .array('size', { type: 'uint8', lengthInBytes: 3 })
      .array('payload', { type: 'uint8', readUntil: 'eof' })
      .parse(data);

    if (!result.payload || result.payload.length === 0) {
      throw QR_READER_ERRORS[QrError.NOT_RAPTOR_PACKAGE];
    }

    this.payload = result.payload;
    this.size = parseInt(u8aToHex(result.size), 16);
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

export default RaptorFrame;
