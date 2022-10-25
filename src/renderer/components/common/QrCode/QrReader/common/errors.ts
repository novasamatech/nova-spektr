import { QrError, ErrorObject } from './types';

export const QR_READER_ERRORS: Record<QrError, ErrorObject> = {
  [QrError.NO_VIDEO_INPUT]: {
    code: QrError.NO_VIDEO_INPUT,
    message: 'No video input found',
  },
  [QrError.USER_DENY]: {
    code: QrError.USER_DENY,
    message: 'User denied camera access',
  },
  [QrError.BAD_NEW_CAMERA]: {
    code: QrError.BAD_NEW_CAMERA,
    message: 'Could not change camera',
  },
  [QrError.FRAME_METADATA]: {
    code: QrError.FRAME_METADATA,
    message: 'No metadata in frame',
  },
  [QrError.NOT_RAPTOR_PACKAGE]: {
    code: QrError.NOT_RAPTOR_PACKAGE,
    message: 'Not a raptor pacakge',
  },
  [QrError.NOT_SAME_QR]: {
    code: QrError.NOT_SAME_QR,
    message: 'QR was changed by another one',
  },
  [QrError.DECODE_ERROR]: {
    code: QrError.DECODE_ERROR,
    message: 'Some decode error',
  },
};
