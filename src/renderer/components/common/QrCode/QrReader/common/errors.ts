import { Errors, ErrorObject } from './types';

export const QR_READER_ERRORS: Record<Errors, ErrorObject> = {
  [Errors.UNABLE_TO_GET_MEDIA]: {
    code: Errors.UNABLE_TO_GET_MEDIA,
    message: 'Cannot get media devices',
  },
  [Errors.NO_VIDEO_INPUT]: {
    code: Errors.NO_VIDEO_INPUT,
    message: 'No video input found',
  },
  [Errors.CANNOT_START]: {
    code: Errors.CANNOT_START,
    message: 'No devices or user denied camera access',
  },
  [Errors.USER_DENY]: {
    code: Errors.USER_DENY,
    message: 'User denied camera access',
  },
  [Errors.BAD_NEW_CAMERA]: {
    code: Errors.BAD_NEW_CAMERA,
    message: 'Could not change camera',
  },
};
