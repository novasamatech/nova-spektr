import { describe, expect, it } from 'vitest';

import { HttpError } from '../contacts/service';

import { descriptionSaveErrorMessage } from './descriptionSaveErrorMessage';

const t = ((key: string) => `translated:${key}`) as Parameters<typeof descriptionSaveErrorMessage>[1];

describe('descriptionSaveErrorMessage', () => {
  it('maps forbidden backend errors to the shared forbidden message', () => {
    expect(descriptionSaveErrorMessage(new HttpError(403, 'Forbidden'), t)).toBe(
      'translated:addressBook.sources.errorForbidden',
    );
  });

  it('uses the error message for non-forbidden errors', () => {
    expect(descriptionSaveErrorMessage(new HttpError(400, 'Bad request'), t)).toBe(
      'Request failed with status 400: Bad request',
    );
    expect(descriptionSaveErrorMessage(new Error('Network failed'), t)).toBe('Network failed');
  });

  it('stringifies non-error values', () => {
    expect(descriptionSaveErrorMessage('failed', t)).toBe('failed');
  });
});
