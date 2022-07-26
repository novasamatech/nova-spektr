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
    const creds = storage.getCreds('userId', 'value');
    const skip = storage.getSkip();
    expect(creds).toEqual(undefined);
    expect(skip).toEqual({ skip: false });
  });

  test('should save new item', () => {
    storage.addCreds(credentials);
    const item = storage.getCreds('userId', '1');
    expect(item).toEqual(credentials);
  });

  test('should update existing item', () => {
    storage.addCreds(credentials);
    storage.updateCreds('1', { username: 'new name' });
    const item = storage.getCreds('userId', '1');
    expect(item?.username).toEqual('new name');
  });

  test('should set and get skip', () => {
    storage.setSkip({ skip: true });
    const item = storage.getSkip();
    expect(item.skip).toEqual(true);
  });
});
