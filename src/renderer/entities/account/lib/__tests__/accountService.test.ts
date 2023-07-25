import { waitFor } from '@testing-library/react';

import storage from '@renderer/services/storage';
import { useAccount } from '@renderer/entities/account/lib/accountService';

jest.mock('@renderer/services/storage', () => jest.fn());

jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: (handler: () => any) => handler(),
}));

describe('service/accountService', () => {
  test('should get all active accounts', () => {
    const accountsDb = [
      { name: 'test_1', isActive: true },
      { name: 'test_2', isActive: false },
    ];

    storage.connectTo = jest.fn().mockReturnValue({
      getAccounts: jest.fn().mockResolvedValue(accountsDb),
    });

    const { getActiveAccounts } = useAccount();
    const accounts = getActiveAccounts();

    waitFor(() => {
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toEqual(accountsDb[0]);
    });
  });

  test('should set new active account', async () => {
    const accountsDb = [{ id: 'test_1', isActive: false }];

    storage.connectTo = jest.fn().mockReturnValue({
      getAccounts: jest.fn().mockResolvedValue(accountsDb),
      updateAccounts: jest.fn().mockImplementation(() => {
        accountsDb[0].isActive = true;
      }),
    });

    const { setActiveAccount } = useAccount();
    await setActiveAccount('test_1');

    expect(accountsDb[0].isActive).toEqual(true);
  });
});
