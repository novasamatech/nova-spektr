import { allSettled, fork } from 'effector';

import { importKeysModel } from '../../model/import-keys-model';
import { DerivationValidationError, ValidationError } from '@features/wallets/ImportKeys/lib/types';
import { importKeysModelMock } from '@features/wallets/ImportKeys/lib/mocks/import-keys-model.mock';

describe('features/ImportKeys/lib/import-keys-model', () => {
  test('should check import file structure', async () => {
    const scope = fork();

    await allSettled(importKeysModel.events.resetValues, { scope, params: { root: '0x00', derivations: [] } });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: importKeysModelMock.invalidFileStructure });

    expect(scope.getState(importKeysModel.$validationError)?.error).toEqual(ValidationError.INVALID_FILE_STRUCTURE);
  });

  test('should check vault public address in import file', async () => {
    const scope = fork();

    await allSettled(importKeysModel.events.resetValues, { scope, params: { root: '0x01', derivations: [] } });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: importKeysModelMock.fileData });

    expect(scope.getState(importKeysModel.$validationError)?.error).toEqual(ValidationError.INVALID_ROOT);
  });

  test('should save invalid derivations paths in $validationError', async () => {
    const scope = fork();

    await allSettled(importKeysModel.events.resetValues, { scope, params: { root: '0x00', derivations: [] } });
    await allSettled(importKeysModel.events.fileUploaded, { scope, params: importKeysModelMock.invalidPaths });

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
