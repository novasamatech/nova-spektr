import { ErrorFields } from '../common/constants';

export const enum Status {
  'FIRST_FRAME',
  'NEXT_FRAME',
}

export const isQrErrorObject = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  return typeof error === 'object' && ErrorFields.CODE in error && ErrorFields.MESSAGE in error;
};
