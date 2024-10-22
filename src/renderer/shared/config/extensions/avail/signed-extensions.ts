import { type ExtDef } from '@polkadot/types/extrinsic/signedExtensions/types';

export const signedExtensions: ExtDef = {
  CheckAppId: {
    extrinsic: {
      appId: 'AppId',
    },
    payload: {},
  },
};
