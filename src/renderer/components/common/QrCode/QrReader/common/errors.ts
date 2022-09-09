import { QrError, ErrorObject } from './types';

export const QR_READER_ERRORS: Record<QrError, ErrorObject> = {
  [QrError.UNABLE_TO_GET_MEDIA]: {
    code: QrError.UNABLE_TO_GET_MEDIA,
    message: 'Cannot get media devices',
  },
  [QrError.NO_VIDEO_INPUT]: {
    code: QrError.NO_VIDEO_INPUT,
    message: 'No video input found',
  },
  [QrError.CANNOT_START]: {
    code: QrError.CANNOT_START,
    message: 'No devices or user denied camera access',
  },
  [QrError.USER_DENY]: {
    code: QrError.USER_DENY,
    message: 'User denied camera access',
  },
  [QrError.BAD_NEW_CAMERA]: {
    code: QrError.BAD_NEW_CAMERA,
    message: 'Could not change camera',
  },
};
