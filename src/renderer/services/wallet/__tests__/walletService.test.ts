import { useWallet } from '@renderer/services/wallet/walletService';
import storage from '@renderer/services/storage';

jest.mock('@renderer/services/storage', () => jest.fn());

jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: (handler: () => any) => handler(),
}));

describe('service/walletService', () => {
  test('should get all active wallets', async () => {
    const walletsDb = [
      { name: 'test_1', isActive: true },
      { name: 'test_2', isActive: false },
    ];

    storage.connectTo = jest.fn().mockReturnValue({
      getWallets: jest.fn().mockResolvedValue(walletsDb),
    });

    const { getActiveWallets } = useWallet();
    const wallets = await getActiveWallets();

    expect(wallets).toHaveLength(1);
    expect(wallets?.[0]).toEqual(walletsDb[0]);
  });

  test('should set new active wallet', async () => {
    const walletsDb = [{ name: 'test_1', isActive: false }];

    storage.connectTo = jest.fn().mockReturnValue({
      getWallet: jest.fn().mockResolvedValue(walletsDb[0]),
      updateWallet: jest.fn().mockImplementation(() => {
        walletsDb[0].isActive = true;
      }),
    });

    const { toggleActiveWallet } = useWallet();
    await toggleActiveWallet('wallet_id');

    expect(walletsDb[0].isActive).toEqual(true);
  });
});
