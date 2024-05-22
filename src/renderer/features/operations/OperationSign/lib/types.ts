import { ApiPromise } from '@polkadot/api';

import { Transaction } from '@entities/transaction';
import { ValidationErrors } from '@shared/lib/utils';
import type { Account, ChainId, HexString, Wallet } from '@shared/core';

export const enum ReconnectStep {
  NOT_STARTED,
  READY_TO_RECONNECT,
  RECONNECTING,
  REJECTED,
  SUCCESS,
}

export type SigningProps = {
  signerWaller?: Wallet;
  chainId: ChainId;
  api: ApiPromise;
  addressPrefix: number;
  accounts: Account[];
  signatory?: Account;
  transactions: Transaction[];
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onGoBack: () => void;
  onResult: (signatures: HexString[], txPayloads: Uint8Array[]) => void;
};

export type InnerSigningProps = SigningProps & { wallet: Wallet };
