import { rpc } from './rpc';
import { signedExtensions } from './signed-extensions';
import { types } from './types';

export const AVAIL_PROVIDER = {
  rpc,
  types,
  signedExtensions,
};

export const AVAIL_TXWRAPPER = {
  additionalTypes: {
    AppId: types['AppId'],
  },
  userExtensions: signedExtensions,
};
