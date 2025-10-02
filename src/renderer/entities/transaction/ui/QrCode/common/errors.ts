import { QR_READER_ERRORS } from '@/shared/ui-kit';

import { DecodeQrError, type ErrorObject } from './types';

export const QR_READER_DECODE_ERRORS: Record<DecodeQrError, ErrorObject> = {
  [DecodeQrError.FRAME_METADATA]: {
    code: DecodeQrError.FRAME_METADATA,
    message: 'No metadata in frame',
  },
  [DecodeQrError.NOT_RAPTOR_PACKAGE]: {
    code: DecodeQrError.NOT_RAPTOR_PACKAGE,
    message: 'Not a raptor pacakge',
  },
  [DecodeQrError.NOT_SAME_QR]: {
    code: DecodeQrError.NOT_SAME_QR,
    message: 'QR was changed by another one',
  },
  [DecodeQrError.INVALID_ERROR]: {
    code: DecodeQrError.INVALID_ERROR,
    message: 'The QR code may be broken or not supported.',
  },
};

export const ALL_QR_READER_ERRORS = {
  ...QR_READER_ERRORS,
  ...QR_READER_DECODE_ERRORS,
};
