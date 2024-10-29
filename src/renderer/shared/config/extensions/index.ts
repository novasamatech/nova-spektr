import { type ExtDef } from '@polkadot/types/extrinsic/signedExtensions/types';
import { type DefinitionRpc, type DefinitionRpcSub, type RegistryTypes } from '@polkadot/types/types';

import { type ChainId } from '@/shared/core';

import { AVAIL_PROVIDER, AVAIL_TXWRAPPER } from './avail';

type Extension = {
  rpc: Record<string, Record<string, DefinitionRpc | DefinitionRpcSub>>;
  types: RegistryTypes;
  signedExtensions: ExtDef;
};

type TxWrapper = {
  additionalTypes: RegistryTypes;
  userExtensions: ExtDef;
};

export const EXTENSIONS: Record<ChainId, { provider: Extension; txwrapper: TxWrapper }> = {
  '0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a': {
    provider: AVAIL_PROVIDER,
    txwrapper: AVAIL_TXWRAPPER,
  },
};
