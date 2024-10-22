import { type ExtDef } from '@polkadot/types/extrinsic/signedExtensions/types';
import { type DefinitionRpc, type DefinitionRpcSub, type RegistryTypes } from '@polkadot/types/types';

import { type ChainId } from '../../core';

import { AVAIL } from './avail';

type Extension = {
  rpc?: Record<string, Record<string, DefinitionRpc | DefinitionRpcSub>>;
  signedExtensions?: ExtDef;
  types?: RegistryTypes;
};

export const EXTENSIONS: Record<ChainId, Extension> = {
  '0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a': AVAIL,
};
