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
  transactions: Transaction[];
  onGoBack: () => void;
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onResult: (signatures: HexString[], unsignedTxs: UnsignedTransaction[]) => void;
};
