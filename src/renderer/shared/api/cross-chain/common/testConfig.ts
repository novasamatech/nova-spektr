import { Action, XcmConfig } from './types';

export const CONFIG: XcmConfig = {
  assetsLocation: {
    DOT: {
      chainId: '91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      multiLocation: {},
      reserveFee: {
        mode: {
          type: 'proportional',
          value: '92895362664',
        },
        instructions: 'xtokensReserve',
      },
    },

    KAR: {
      chainId: 'baf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b',
      multiLocation: { parachainId: 2000, generalKey: '0x0080' },
      reserveFee: {
        mode: { type: 'proportional', value: '10016000000000' },
        instructions: 'xtokensReserve',
      },
    },
    ACA: {
      chainId: 'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      multiLocation: {
        parachainId: 2000,
        generalKey: '0x0000',
      },
      reserveFee: {
        mode: {
          type: 'proportional',
          value: '10016000000000',
        },
        instructions: 'xtokensReserve',
      },
    },
  },
  instructions: {
    xtokensDest: [Action.RESERVE_ASSET_DEPOSITED, Action.CLEAR_ORIGIN, Action.BUY_EXECUTION, Action.DEPOSIT_ASSET],
    xtokensReserve: [Action.WITHDRAW_ASSET, Action.CLEAR_ORIGIN, Action.BUY_EXECUTION, Action.DEPOSIT_RESERVE_ASSET],
    xcmPalletDest: [Action.RESERVE_ASSET_DEPOSITED, Action.CLEAR_ORIGIN, Action.BUY_EXECUTION, Action.DEPOSIT_ASSET],
    xcmPalletTeleportDest: [
      Action.RECEIVE_TELEPORTED_ASSET,
      Action.CLEAR_ORIGIN,
      Action.BUY_EXECUTION,
      Action.DEPOSIT_ASSET,
    ],
  },
  networkBaseWeight: {
    b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe: '1000000000',
    baf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b: '200000000',
    fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c: '200000000',
    fe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d: '200000000',
    '64a1c658a48b2e70a7fb1ad4c39eea35022568c20fc44a6e2e3d0a57aee6053b': '150000000',
    e61a41c53f5dcd0beb09df93b34402aada44cb05117b71059cce40a2723a4e97: '150000000',
    '91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': '1000000000',
  },
  chains: [
    {
      chainId: 'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      assets: [
        {
          assetId: 0,
          assetLocation: 'ACA',
          assetLocationPath: {
            type: 'absolute',
          },
          xcmTransfers: [
            {
              destination: {
                chainId: 'fe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d',
                assetId: 3,
                fee: {
                  mode: {
                    type: 'proportional',
                    value: '115534810638445',
                  },
                  instructions: 'xtokensDest',
                },
              },
              type: 'xtokens',
            },
            {
              destination: {
                chainId: 'e61a41c53f5dcd0beb09df93b34402aada44cb05117b71059cce40a2723a4e97',
                assetId: 3,
                fee: {
                  mode: {
                    type: 'proportional',
                    value: '196078431372549',
                  },
                  instructions: 'xtokensDest',
                },
              },
              type: 'xtokens',
            },
          ],
        },
        {
          assetId: 3,
          assetLocation: 'DOT',
          assetLocationPath: {
            type: 'absolute',
          },
          xcmTransfers: [
            {
              destination: {
                chainId: 'e61a41c53f5dcd0beb09df93b34402aada44cb05117b71059cce40a2723a4e97',
                assetId: 1,
                fee: {
                  mode: {
                    type: 'proportional',
                    value: '53711462025',
                  },
                  instructions: 'xtokensDest',
                },
              },
              type: 'xtokens',
            },
          ],
        },
      ],
    },
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
