import { type U8aFixed } from '@polkadot/types';
import { type PalletMultisigMultisig } from '@polkadot/types/lookup';

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
