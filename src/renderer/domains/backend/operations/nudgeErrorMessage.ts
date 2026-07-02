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
        // The cooldown is shared per multisig, so phrase the wait as a duration rather than
        // an absolute time — "in 40 minutes" reads the same regardless of who pinged last.
        const minutesLeft = Math.ceil((date.getTime() - Date.now()) / 60_000);
        if (!Number.isNaN(date.getTime()) && minutesLeft > 0) {
          const duration =
            minutesLeft < 60
              ? t('operation.notifySigners.durationMinutes', { count: minutesLeft })
              : t('operation.notifySigners.durationHours', { count: Math.ceil(minutesLeft / 60) });

          return t('operation.notifySigners.errorRateLimited', { duration });
        }
      }

      return t('operation.notifySigners.errorRateLimitedNoTime');
    }
  }

  return error instanceof Error ? error.message : String(error);
}
