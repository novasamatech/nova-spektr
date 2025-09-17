import { type TFunction } from 'i18next';
import { isObject } from 'lodash';

export type WalletConnectErrorType = 'userRejected' | 'networkError' | 'sessionError' | 'unknownError';

export interface WalletConnectErrorInfo {
  type: WalletConnectErrorType;
  message: string;
}

export const getTranslatedErrorMessage = (type: WalletConnectErrorType, t: TFunction): string => {
  return t(`operation.walletConnect.errors.${type}`);
};

export const getWalletConnectErrorInfo = (
  error: unknown,
  sdkErrors: Record<string, { code: number; message: string }>,
): WalletConnectErrorInfo => {
  if (isObject(error) && 'code' in error) {
    const code = (error as { code: unknown }).code;
    const message = 'message' in error && typeof error.message === 'string' ? error.message : 'Unknown error';

    // User rejected errors
    if (
      code === sdkErrors.USER_REJECTED.code ||
      code === sdkErrors.USER_REJECTED_CHAINS.code ||
      code === sdkErrors.USER_REJECTED_METHODS.code ||
      code === sdkErrors.USER_REJECTED_EVENTS.code
    ) {
      return {
        type: 'userRejected',
        message: message,
      };
    }

    // Network errors
    if (
      code === sdkErrors.UNSUPPORTED_CHAINS.code ||
      code === sdkErrors.UNSUPPORTED_METHODS.code ||
      code === sdkErrors.UNSUPPORTED_EVENTS.code ||
      code === sdkErrors.UNSUPPORTED_ACCOUNTS.code ||
      code === sdkErrors.UNSUPPORTED_NAMESPACE_KEY.code ||
      code === sdkErrors.SESSION_SETTLEMENT_FAILED.code ||
      code === sdkErrors.WC_METHOD_UNSUPPORTED.code
    ) {
      return {
        type: 'networkError',
        message: message,
      };
    }

    // Session errors
    if (code === sdkErrors.USER_DISCONNECTED.code) {
      return {
        type: 'sessionError',
        message: message,
      };
    }
  }

  return {
    type: 'unknownError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
  };
};
