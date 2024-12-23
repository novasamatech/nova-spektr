import { BN } from '@polkadot/util';

import { TEST_ACCOUNTS } from '@/shared/lib/utils';

import { Action } from './types';

export const XCM_URL = 'https://raw.githubusercontent.com/novasamatech/nova-utils/master/xcm/v6/transfers.json';
export const XCM_KEY = 'xcm-config';

export const SET_TOPIC_SIZE = new BN(33);
export const FACTOR_MULTIPLIER = new BN(18);

export const INSTRUCTION_OBJECT: Record<Action, (assetLocation: object, destLocation: object) => object> = {
  [Action.WITHDRAW_ASSET]: (assetLocation: object) => {
    return {
      WithdrawAsset: [
        {
          fun: {
            Fungible: '0',
          },
          id: assetLocation,
        },
      ],
    };
  },

  [Action.CLEAR_ORIGIN]: () => {
    return {
      ClearOrigin: null,
    };
  },

  [Action.DEPOSIT_ASSET]: () => {
    return {
      DepositAsset: {
        assets: {
          Wild: 'All',
        },
        maxAssets: 1,
        beneficiary: {
          interior: {
            X1: {
              AccountId32: {
                network: 'Any',
                id: TEST_ACCOUNTS[0],
              },
            },
          },
          parents: 0,
        },
      },
    };
  },

  [Action.DEPOSIT_RESERVE_ASSET]: (_, destLocation) => {
    return {
      DepositReserveAsset: {
        assets: {
          Wild: 'All',
        },
        dest: destLocation,
        xcm: [],
      },
    };
  },

  [Action.RECEIVE_TELEPORTED_ASSET]: (assetLocation: object) => {
    return {
      ReceiveTeleportedAsset: [
        {
          fun: {
            Fungible: '0',
          },
          id: {
            Concrete: assetLocation,
          },
        },
      ],
    };
  },

  [Action.RESERVE_ASSET_DEPOSITED]: (assetLocation: object) => {
    return {
      ReserveAssetDeposited: [
        {
          fun: {
            Fungible: '0',
          },
          id: {
            Concrete: assetLocation,
          },
        },
      ],
    };
  },

  [Action.BUY_EXECUTION]: (assetLocation: object) => {
    return {
      BuyExecution: {
        fees: {
          id: {
            Concrete: assetLocation,
          },
          fun: {
            Fungible: '0',
          },
        },
        weightLimit: {
          Unlimited: true,
        },
      },
    };
  },
};
