import { type ExtDef } from '@polkadot/types/extrinsic/signedExtensions/types';
import { type DefinitionRpc, type DefinitionRpcSub, type RegistryTypes } from '@polkadot/types/types';

export type Extension = {
  rpc?: Record<string, Record<string, DefinitionRpc | DefinitionRpcSub>>;
  types: RegistryTypes;
  signedExtensions?: ExtDef;
};

export type TxWrapper = {
  additionalTypes: RegistryTypes;
  userExtensions?: ExtDef;
};
