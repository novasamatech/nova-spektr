import { type ApiPromise } from '@polkadot/api';
import { type U8aFixed } from '@polkadot/types';
import { type PalletMultisigMultisig } from '@polkadot/types/lookup';

import { type MultisigTransactionDS } from '@/shared/api/storage';
import {
  type CallData,
  type CallHash,
  type ChainId,
  type MultisigAccount,
  type MultisigTransaction,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export interface IMultisigTxService {
  subscribeMultisigAccount: (api: ApiPromise, account: MultisigAccount) => () => void;
  getMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (accountIds: AccountId[]) => Promise<MultisigTransactionDS[]>;
  getLiveMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => MultisigTransactionDS[];
  getLiveAccountMultisigTxs: (accountIds: AccountId[]) => MultisigTransactionDS[];
  addMultisigTx: (tx: MultisigTransaction) => Promise<void>;
  updateMultisigTx: (tx: MultisigTransaction) => Promise<number>;
  deleteMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ) => Promise<void>;
  updateCallData: (api: ApiPromise, tx: MultisigTransaction, callData: CallData) => Promise<void>;
  updateCallDataFromChain: (
    api: ApiPromise,
    tx: MultisigTransaction,
    blockHeight: number,
    extrinsicIndex: number,
  ) => Promise<void>;
}

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
