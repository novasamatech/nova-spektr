import { allSettled, fork } from 'effector';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { importKeysModel } from '../../model/import-keys-model';
import { importKeysModelMock } from '../mocks/import-keys-model.mock';
import { DerivationValidationError, ValidationError } from '../types';

describe('features/ImportKeys/lib/import-keys-model', () => {
  test('should check import file structure', async () => {
    const scope = fork();
    const file = { type: 'application/yaml', text: async () => importKeysModelMock.invalidFileStructure };

    await allSettled(importKeysModel.events.resetValues, {
      scope,
      params: { root: '0x00' as AccountId, derivations: [] },
    });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: file });

    expect(scope.getState(importKeysModel.$validationError)?.error).toEqual(ValidationError.INVALID_FILE_STRUCTURE);
  });

  test('should check import file structure with txt file', async () => {
    const scope = fork();
    const file = { type: 'text/plain', text: async () => importKeysModelMock.invalidFileStructure };

    await allSettled(importKeysModel.events.resetValues, {
      scope,
      params: { root: '0x00' as AccountId, derivations: [] },
    });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: file });

    expect(scope.getState(importKeysModel.$validationError)?.error).toEqual(ValidationError.INVALID_FILE_STRUCTURE);
  });

  test('should check vault public address in import file', async () => {
    const scope = fork();
    const file = { type: 'application/yaml', text: async () => importKeysModelMock.fileData };

    await allSettled(importKeysModel.events.resetValues, {
      scope,
      params: { root: '0x01' as AccountId, derivations: [] },
    });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: file });

    expect(scope.getState(importKeysModel.$validationError)?.error).toEqual(ValidationError.INVALID_ROOT);
  });

  test('should save invalid derivations paths in $validationError', async () => {
    const scope = fork();
    const file = { type: 'application/yaml', text: async () => importKeysModelMock.invalidPaths };

    await allSettled(importKeysModel.events.resetValues, {
      scope,
      params: { root: '0x00' as AccountId, derivations: [] },
    });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: file });

    const validationError = {
      error: ValidationError.DERIVATIONS_ERROR,
      details: {
        [DerivationValidationError.PASSWORD_PATH]: ['//polkadot///password'],
        [DerivationValidationError.MISSING_NAME]: [],
        [DerivationValidationError.INVALID_PATH]: ['invalid_path1', 'invalid_path2'],
        [DerivationValidationError.WRONG_SHARDS_NUMBER]: [],
      },
    };

    expect(scope.getState(importKeysModel.$validationError)).toEqual(validationError);
  });
});
