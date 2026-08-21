import { type BN } from '@polkadot/util';

import {
  type Asset,
  type AssetByChains,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
} from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

export type OperationAmountValue = {
  value: BN | string;
  asset: Asset | AssetByChains;
};

export type OperationTitle = {
  title?: string;
  amount?: OperationAmountValue;
  sourceChainId?: ChainId;
  destinationChainId?: ChainId; // For XCM transactions
};

export type OperationWithAccount = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};
