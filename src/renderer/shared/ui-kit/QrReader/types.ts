import { type DecodeContinuouslyCallback } from '@zxing/browser/esm/common/DecodeContinuouslyCallback';

export const enum QrReaderErrorCode {
  USER_DENY,
  NO_VIDEO_INPUT,
  BAD_NEW_CAMERA,
  DECODE_ERROR,
}

export type DecodeCallback = DecodeContinuouslyCallback;

export type QrReaderCamera = {
  deviceId: string;
  label: string;
};

export type QrReaderError = {
  code: QrReaderErrorCode;
  message: string;
};
