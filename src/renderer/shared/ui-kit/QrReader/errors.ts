import { type QrReaderError, QrReaderErrorCode } from './types';

export const QR_READER_ERRORS: Record<QrReaderErrorCode, QrReaderError> = {
  [QrReaderErrorCode.NO_VIDEO_INPUT]: {
    code: QrReaderErrorCode.NO_VIDEO_INPUT,
    message: 'No video input found',
  },
  [QrReaderErrorCode.USER_DENY]: {
    code: QrReaderErrorCode.USER_DENY,
    message: 'User denied camera access',
  },
  [QrReaderErrorCode.BAD_NEW_CAMERA]: {
    code: QrReaderErrorCode.BAD_NEW_CAMERA,
    message: 'Could not change camera',
  },
  [QrReaderErrorCode.DECODE_ERROR]: {
    code: QrReaderErrorCode.DECODE_ERROR,
    message: 'Some decode error',
  },
};
