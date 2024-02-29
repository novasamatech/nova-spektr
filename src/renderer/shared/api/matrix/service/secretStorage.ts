import { ISecretStorage } from '../common/types';

class SecretStorage implements ISecretStorage {
  private secretStorage: Map<string, Uint8Array>;

  constructor() {
    this.secretStorage = new Map();

    // Bind functions for outer reference (cryptoCallbacks)
    this.getSecretStorageKey = this.getSecretStorageKey.bind(this);
    this.cacheSecretStorageKey = this.cacheSecretStorageKey.bind(this);
    this.hasPrivateKey = this.hasPrivateKey.bind(this);
    this.getPrivateKey = this.getPrivateKey.bind(this);
  }

  /**
   * Save private key to the storage
   * @param keyId key value
   * @param privateKey private key value
   */
  public storePrivateKey(keyId: string, privateKey: Uint8Array | unknown): void | never {
    if (!(privateKey instanceof Uint8Array)) {
      throw new Error('Unable to store, privateKey is invalid.');
    }
    this.secretStorage.set(keyId, privateKey);
  }

  /**
   * Check is private key already saved
   * @param keyId key value
   * @return {Boolean}
   */
  public hasPrivateKey(keyId: string): boolean {
    return this.secretStorage.get(keyId) instanceof Uint8Array;
  }

  /**
   * Retrieve private key from storage
   * @param keyId key value
   * @return {Uint8Array | undefined}
   */
  public getPrivateKey(keyId: string): Uint8Array | undefined {
    return this.secretStorage.get(keyId);
  }

  /**
   * Delete private key from storage
   * @param keyId key value
   */
  public deletePrivateKey(keyId: string): void {
    this.secretStorage.delete(keyId);
  }

  /**
   * Clear the storage
   */
  public clearSecretStorageKeys(): void {
    this.secretStorage.clear();
  }

  /**
   * Get object with callbacks to work with storage
   * @return {Object}
   */
  public get cryptoCallbacks() {
    return {
      getSecretStorageKey: this.getSecretStorageKey,
      cacheSecretStorageKey: this.cacheSecretStorageKey,
    };
  }

  /**
   * Get tuple of keyId and privateKey from storage
   * @param value keys to search
   * @return {Promise}
   */
  private async getSecretStorageKey(value: { keys: Record<string, any> }): Promise<[string, Uint8Array] | null> {
    const keyId = Object.keys(value.keys).find(this.hasPrivateKey);

    if (!keyId) return null;
    const privateKey = this.getPrivateKey(keyId);
    if (!privateKey) return null;

    return [keyId, privateKey];
  }

  /**
   * Save private key to the storage
   * @param keyId key value
   * @param keyInfo key info
   * @param privateKey private key value
   */
  private cacheSecretStorageKey(keyId: string, keyInfo: any, privateKey: Uint8Array): void {
    this.secretStorage.set(keyId, privateKey);
  }
}

export default SecretStorage;
