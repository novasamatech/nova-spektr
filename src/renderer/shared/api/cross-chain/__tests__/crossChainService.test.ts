import { XcmConfig } from '../common/types';
import { XCM_KEY } from '../common/constants';
import { getXcmConfig } from '../crossChainService';

const CONFIG: XcmConfig = {
  assetsLocation: {
    KAR: {
      chainId: 'baf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
      multiLocation: { parachainId: 2000, generalKey: '0x0080' },
      reserveFee: {
        mode: { type: 'proportional', value: '10016000000000' },
        instructions: 'xtokensReserve',
      },
    },
  },
  instructions: {
    xtokensDest: ['ReserveAssetDeposited', 'ClearOrigin', 'BuyExecution', 'DepositAsset'],
    xtokensReserve: ['WithdrawAsset', 'ClearOrigin', 'BuyExecution', 'DepositReserveAsset'],
    xcmPalletDest: ['ReserveAssetDeposited', 'ClearOrigin', 'BuyExecution', 'DepositAsset'],
    xcmPalletTeleportDest: ['ReceiveTeleportedAsset', 'ClearOrigin', 'BuyExecution', 'DepositAsset'],
  },
  networkBaseWeight: {
    b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe: '1000000000',
  },
  chains: [
    {
      chainId: '401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b',
      assets: [
        {
          assetId: 4,
          assetLocation: 'KAR',
          assetLocationPath: { type: 'absolute' },
          xcmTransfers: [
            {
              type: 'xtokens',
              destination: {
                chainId: 'baf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
                assetId: 0,
                fee: {
                  mode: { type: 'proportional', value: '10016000000000' },
                  instructions: 'xtokensDest',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('shared/api/cross-chain/crossChainService', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('should get empty config from localStorage', () => {
    localStorage.clear();

    const config = getXcmConfig();
    expect(config).toEqual(null);
  });

  test('should get not empty config from localStorage', () => {
    localStorage.clear();
    localStorage.setItem(XCM_KEY, JSON.stringify(CONFIG));

    const config = getXcmConfig();
    expect(config).toEqual(CONFIG);
  });
});
