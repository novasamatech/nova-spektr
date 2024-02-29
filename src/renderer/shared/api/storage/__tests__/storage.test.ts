import { storage } from '../service/dexie';

jest.mock(
  'dexie',
  jest.fn().mockImplementation(() => {
    return jest.fn().mockReturnValue({
      version: jest.fn().mockReturnValue({
        stores: jest.fn().mockReturnValue({
          upgrade: jest.fn(),
        }),
      }),
      table: jest.fn(),
    });
  }),
);

describe('service/storage/storage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return right data storage', () => {
    const balancesStorage = storage.connectTo('balances');

    expect(balancesStorage).toBeDefined();
  });

  test('should return undefined for wrong storage name', () => {
    // @ts-ignore remove TS warning about wrong storage
    const wrongStorage = storage.connectTo('wrong_name');

    expect(wrongStorage).toBeUndefined();
  });
});
