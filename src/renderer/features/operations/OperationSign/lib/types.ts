import { type ApiPromise } from '@polkadot/api';

import { type Chain, type HexString, type Transaction, type Wallet } from '@/shared/core';
import { type ValidationErrors } from '@/shared/lib/utils';
import { type AnyAccount, type AnyTransaction, type Extrinsic } from '@/domains/network';

export const enum ReconnectStep {
  NOT_STARTED,
  READY_TO_RECONNECT,
  RECONNECTING,
  REJECTED,
  FAILED,
  SUCCESS,
}

export type SigningProps = {
  signerWallet?: Wallet;
  signingPayloads: ExtrinsicSigningPayload[];
  validateBalance?: () => Promise<ValidationErrors | undefined>;
  onGoBack: () => void;
  onResult: (signatures: HexString[], txPayloads: Uint8Array[]) => void;
};

/**
 * @deprecated Use ExtrinsicSigningPayload instead
 */
export type SigningPayload = {
  chain: Chain;
  account: AnyAccount;
  transaction: Transaction;
  signatory: AnyAccount | null;
};

export type TransactionSigningPayload = {
  api: ApiPromise;
  chain: Chain;
  signatory: AnyAccount;
  transaction: AnyTransaction;
};

export type ExtrinsicSigningPayload = {
  api: ApiPromise;
  chain: Chain;
  signatory: AnyAccount;
  extrinsic: Extrinsic;
};
