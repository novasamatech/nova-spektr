import { type Credential, type ICredentialStorage } from '../lib/types';

class CredentialStorage implements ICredentialStorage {
  private credsKey = 'matrix_credentials';

  constructor() {
    const credStorage = this.getCredentialsStorage();

    if (!credStorage) {
      localStorage.setItem(this.credsKey, JSON.stringify([]));
    }
  }

  /**
   * Add new credential to the storage
   *
   * @param credential Value of credentials
   */
  public saveCredentials(credential: Credential): void {
    const storage = this.getCredentialsStorage();

    storage.push(credential);
    localStorage.setItem(this.credsKey, JSON.stringify(storage));
  }

  /**
   * Get credentials from the storage
   *
   * @param key Key to use in search
   * @param value Search value
   *
   * @returns {Object | undefined}
   */
  public getCredentials(key: keyof Credential, value: any): Credential | undefined {
    const storage = this.getCredentialsStorage();

    return storage.find((item) => item[key] === value);
  }

  /**
   * Update storage item
   *
   * @param userId Key to use in search
   * @param credentials Credentials data
   */
  public updateCredentials(userId: string, credentials: Partial<Credential>): void {
    const storage = this.getCredentialsStorage();

    const index = storage.findIndex((item) => item.userId === userId);
    if (index === -1) {
      console.warn('🔶 Matrix storage item not found - ', userId);

      return;
    }

    storage[index] = { ...storage[index], ...credentials };
    localStorage.setItem(this.credsKey, JSON.stringify(storage));
  }

  /**
   * Clear matrix storage
   */
  public clear() {
    localStorage.removeItem(this.credsKey);
  }

  /**
   * Get credentials storage
   *
   * @returns {Array}
   */
  private getCredentialsStorage(): Credential[] {
    const storage = localStorage.getItem(this.credsKey);

    try {
      return storage ? JSON.parse(storage) : [];
    } catch (error) {
      console.error('🔶 Matrix credentials storage error - ', error);

      return [];
    }
  }
}

export default CredentialStorage;
