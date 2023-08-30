import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { Account } from '@renderer/entities/account';
import { Transaction } from '@renderer/entities/transaction';
import { ValidationErrors } from '@renderer/shared/lib/utils';

export type SigningProps = {
  chainId: ChainId;
  api: ApiPromise;
  addressPrefix: number;
  accounts: Account[];
  signatory?: Account;
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onGoBack: () => void;
  transactions: Transaction[];
  onResult: (signatures: HexString[], unsignedTxs: UnsignedTransaction[]) => void;
};
