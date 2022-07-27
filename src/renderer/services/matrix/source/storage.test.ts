import { MatrixStorage } from './storage';
import { ICredentialStorage } from '../common/types';

describe('service/matrix/storage', () => {
  let storage: ICredentialStorage;
  const credentials = {
    userId: '1',
    username: 'name',
    accessToken: 'token',
    deviceId: '0x123',
    isLastLogin: false,
    baseUrl: 'https://test.com',
  };

  beforeEach(() => {
    storage = new MatrixStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  test('should init with default values', () => {
    const creds = storage.getCredentials('userId', 'value');
    const skip = storage.getSkipLogin();
    expect(creds).toEqual(undefined);
    expect(skip).toEqual({ skip: false });
  });

  test('should save new item', () => {
    storage.saveCredentials(credentials);
    const item = storage.getCredentials('userId', '1');
    expect(item).toEqual(credentials);
  });

  test('should update existing item', () => {
    storage.saveCredentials(credentials);
    storage.updateCredentials('1', { username: 'new name' });
    const item = storage.getCredentials('userId', '1');
    expect(item?.username).toEqual('new name');
  });

  test('should set and get skip value', () => {
    storage.saveSkipLogin({ skip: true });
    const item = storage.getSkipLogin();
    expect(item.skip).toEqual(true);
  });
});
