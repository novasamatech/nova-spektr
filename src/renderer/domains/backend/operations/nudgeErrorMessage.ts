import { type TFunction } from 'i18next';

import { HttpError } from '../contacts/service';

const ISO_TIMESTAMP = /(\d{4}-\d{2}-\d{2}T[0-9:.]+Z)/;

export function nudgeErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof HttpError) {
    if (error.status === 403) return t('operation.notifySigners.errorForbidden');
    if (error.status === 404) return t('operation.notifySigners.errorNotAvailable');
    if (error.status === 429) {
      const match = error.message.match(ISO_TIMESTAMP);
      if (match) {
        const date = new Date(match[1]!);
        if (!Number.isNaN(date.getTime())) {
          return t('operation.notifySigners.errorRateLimited', { time: date.toLocaleString() });
        }
      }

      return t('operation.notifySigners.errorRateLimitedNoTime');
    }
  }

  return error instanceof Error ? error.message : String(error);
}
