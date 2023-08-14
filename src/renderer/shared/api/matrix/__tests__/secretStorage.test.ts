import SecretStorage from '../service/secretStorage';
import { ISecretStorage } from '../common/types';

describe('service/matrix/secretStorage', () => {
  let storage: ISecretStorage;
  const privateKey = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    storage = new SecretStorage();
  });

  test('should store private key', () => {
    let hasKey = storage.hasPrivateKey('test');
    expect(hasKey).toEqual(false);

    storage.storePrivateKey('test', privateKey);

    hasKey = storage.hasPrivateKey('test');
    expect(hasKey).toEqual(true);
  });

  test('should delete private key', () => {
    storage.storePrivateKey('test', privateKey);

    let hasKey = storage.hasPrivateKey('test');
    expect(hasKey).toEqual(true);

    storage.deletePrivateKey('test');
    hasKey = storage.hasPrivateKey('test');
    expect(hasKey).toEqual(false);
  });

  test('should clear storage', () => {
    storage.storePrivateKey('test_1', privateKey);
    storage.storePrivateKey('test_2', privateKey);

    let hasKey1 = storage.hasPrivateKey('test_1');
    let hasKey2 = storage.hasPrivateKey('test_2');
    expect(hasKey1).toEqual(true);
    expect(hasKey2).toEqual(true);

    storage.clearSecretStorageKeys();
    hasKey1 = storage.hasPrivateKey('test_1');
    hasKey2 = storage.hasPrivateKey('test_2');
    expect(hasKey1).toEqual(false);
    expect(hasKey2).toEqual(false);
  });
});
