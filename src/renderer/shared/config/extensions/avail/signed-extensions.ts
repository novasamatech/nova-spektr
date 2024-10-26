import { type ExtDef } from '@polkadot/types/extrinsic/signedExtensions/types';

export const signedExtensions: ExtDef = {
  CheckAppId: {
    payload: {},
    extrinsic: {
      appId: 'AppId',
    },
  },
};
