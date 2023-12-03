import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Transaction } from '@entities/transaction';
import { ValidationErrors } from '@shared/lib/utils';
import type { Account, ChainId, HexString, Wallet } from '@shared/core';

export type SigningProps = {
  chainId: ChainId;
  api: ApiPromise;
  addressPrefix: number;
  accounts: Account[];
  signatory?: Account;
  transactions: Transaction[];
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onGoBack: () => void;
  onResult: (signatures: HexString[], unsignedTxs: UnsignedTransaction[]) => void;
};

export type InnerSigningProps = SigningProps & { wallet: Wallet };
