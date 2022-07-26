import { ICredentialStorage, Credential, SkipLogin } from '../common/types';

export class MatrixStorage implements ICredentialStorage {
  private credsKey = 'matrix_credentials';
  private skipKey = 'matrix_skip_login';

  constructor() {
    const credStorage = this.getCredentialsStorage();
    const skipStorage = this.getSkipStorage();

    if (!credStorage) {
      localStorage.setItem(this.credsKey, JSON.stringify([]));
    }

    if (!skipStorage) {
      localStorage.setItem(this.skipKey, JSON.stringify({ skip: false }));
    }
  }

  /**
   * Add new credential to the storage
   * @param credential value of credentials
   */
  addCreds(credential: Credential): void {
    const storage = this.getCredentialsStorage();

    storage.push(credential);
    localStorage.setItem(this.credsKey, JSON.stringify(storage));
  }

  /**
   * Get credentials from the storage
   * @param key key to use in search
   * @param value search value
   * @return {Object | undefined}
   */
  getCreds(key: keyof Credential, value: any): Credential | undefined {
    const storage = this.getCredentialsStorage();

    return storage.find((item) => item[key] === value);
  }

  /**
   *  Update storage item
   *  @param userId key to use in search
   *  @param credentials credentials data
   */
  updateCreds(userId: string, credentials: Partial<Credential>): void {
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
   * Set flag about skip login
   * @param data skip data
   */
  setSkip(data: SkipLogin): void {
    localStorage.setItem(this.skipKey, JSON.stringify(data));
  }

  /**
   * Get skip login data from the storage
   * @return {Object}
   */
  getSkip(): SkipLogin {
    return this.getSkipStorage();
  }

  /**
   * Clear matrix storage
   */
  clear() {
    localStorage.removeItem(this.credsKey);
    localStorage.removeItem(this.skipKey);
  }

  /**
   *  Get credentials storage
   *  @return {Array}
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

  /**
   *  Get skip login storage
   *  @return {Object}
   */
  private getSkipStorage(): Record<'skip', boolean> {
    const storage = localStorage.getItem(this.skipKey);

    try {
      return storage ? JSON.parse(storage) : { skip: false };
    } catch (error) {
      console.error('🔶 Matrix skip login storage error - ', error);

      return { skip: false };
    }
  }
}
