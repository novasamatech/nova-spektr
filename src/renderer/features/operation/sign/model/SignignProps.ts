import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Transaction } from '@renderer/entities/transaction';
import { ValidationErrors } from '@renderer/shared/lib/utils';
import type { Account, ChainId, HexString } from '@renderer/shared/core';

export type SigningProps = {
  chainId: ChainId;
  api: ApiPromise;
  addressPrefix: number;
  accounts: Account[];
  signatory?: Account;
  transactions: Transaction[];
  onGoBack: () => void;
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onResult: (signatures: HexString[], unsignedTxs: UnsignedTransaction[]) => void;
};
