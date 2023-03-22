import { ApiPromise } from '@polkadot/api';
import { U8aFixed } from '@polkadot/types';
import { PalletMultisigMultisig } from '@polkadot/types/lookup';
import { IndexableType } from 'dexie';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { MultisigTransaction } from '@renderer/domain/transaction';

export interface IMultisigTxService {
  subscribeMultisigAccount: (api: ApiPromise, account: MultisigAccount) => () => void;
  getTx: (txId: IndexableType) => Promise<MultisigTransactionDS | undefined>;
  getTxs: (where?: Record<string, any>) => Promise<MultisigTransactionDS[]>;
  addTx: (tx: MultisigTransaction) => Promise<IndexableType>;
  updateTx: (tx: MultisigTransactionDS) => Promise<IndexableType>;
  deleteTx: (txId: IndexableType) => Promise<void>;
}

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
