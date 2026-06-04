import { type TFunction } from 'i18next';

import { HttpError } from '../contacts/service';

export function descriptionSaveErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof HttpError && error.status === 403) {
    return t('addressBook.sources.errorForbidden');
  }

  return error instanceof Error ? error.message : String(error);
}
