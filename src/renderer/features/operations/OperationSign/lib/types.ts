import { type ApiPromise } from '@polkadot/api';

import type { Account, Chain, ChainId, HexString, Transaction, Wallet } from '@shared/core';
import { type ValidationErrors } from '@shared/lib/utils';

export const enum ReconnectStep {
  NOT_STARTED,
  READY_TO_RECONNECT,
  RECONNECTING,
  REJECTED,
  SUCCESS,
}

export type SigningProps = {
  signerWallet?: Wallet;
  apis: Record<ChainId, ApiPromise>;
  signingPayloads: SigningPayload[];
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onGoBack: () => void;
  onResult: (signatures: HexString[], txPayloads: Uint8Array[]) => void;
};

export type InnerSigningProps = SigningProps & { wallet: Wallet };

export type SigningPayload = {
  chain: Chain;
  account: Account;
  transaction: Transaction;
  signatory?: Account;
};
