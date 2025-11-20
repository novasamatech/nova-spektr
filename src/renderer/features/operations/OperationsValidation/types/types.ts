import { type SignerOptions } from '@polkadot/api/types';
import { type BN } from '@polkadot/util';

import {
  type Asset,
  type BalanceMap,
  type Chain,
  type ChainId,
  type ID,
  type Transaction,
  type TransactionType,
} from '@/shared/core';

export type ValidatorBalanceMap = Record<'balance' | 'native', string>;

export type Validation<Value = any, Form = any, Source = any> = {
  value: Value;
  name: string;
  errorText: string;
  source: Source;
  form: Form;
  validator: (value: Value, form: Form, source: Source) => boolean;
};

export type ValidationResult =
  | {
      name: string;
      errorText: string;
      label?: string;
    }
  | undefined;

export type AccountStore = {
  fee: string;
  proxyDeposit: string;
  balances: BalanceMap;
  isMultisig: boolean;
};

export type TransferAccountStore = {
  fee: string;
  isProxy: boolean;
  proxyBalance: ValidatorBalanceMap;
};

export type SignatoryStore = {
  fee: string;
  proxyDeposit: string;
  multisigDeposit: string;
  balances: BalanceMap;
  isMultisig: boolean;
};

export type ShardsProxyFeeStore = {
  feeData: { fee: string };
  isProxy: boolean;
  proxyBalance: string;
};

export type NetworkStore = {
  chain: Chain;
  asset: Asset;
};

export type ShardsBondBalanceStore = {
  isProxy: boolean;
  network: NetworkStore;
  accountsBalances: string[];
};

export type BondAmountBalanceStore = {
  network: NetworkStore;
  bondBalanceRange: string | string[];
};

export type RestakeAmountBalanceStore = {
  network: NetworkStore;
  restakeBalanceRange: string | string[];
};

export type UnstakeAmountBalanceRange = {
  network: NetworkStore;
  unstakeBalanceRange: string | string[];
};

export type WithdrawBalanceRange = {
  network: NetworkStore;
  withdrawBalanceRange: string | string[];
};

export type AmountFeeStore = {
  feeData: { fee: string };
  isMultisig: boolean;
  network: NetworkStore;
  accountsBalances: string[];
};

export type TransferAmountFeeStore = {
  balance: ValidatorBalanceMap | null;
  network: NetworkStore | null;
  isXcm: boolean;
  isNative: boolean;
  isMultisig: boolean;
  isProxy: boolean;
  fee: BN;
  xcmFee: BN;
  destinationFee: BN;
};

export type TransferFeeStore = Omit<TransferAmountFeeStore, 'balance' | 'network'> & {
  amount: string;
  asset: Asset;
  balance: string;
};

export type TransferXcmFeeStore = Omit<TransferAmountFeeStore, 'balance' | 'network'> & {
  transferableAsset: Asset;
  transferableBalance: string;
  nativeBalance: string;
  amount: string;
};

export type SignatoryFeeStore = {
  feeData: { fee: string; multisigDeposit: string };
  isMultisig: boolean;
  signatoryBalance: string;
};

export type TransferSignatoryFeeStore = {
  fee: BN;
  isMultisig: boolean;
  multisigDeposit: BN;
  balance: string;
};

export type Config = {
  withFormatAmount: boolean;
};

export type ChainProxyStore = {
  maxProxies: number;
  proxies: any[];
};

export type DelegateFeeStore = {
  fee: string;
  balance: ValidatorBalanceMap;
  network: NetworkStore | null;
  isMultisig: boolean;
};

export type FeeMap = Record<ChainId, Record<TransactionType, string>>;

export type ValidationStartedParams = {
  id: ID;
  transaction: Transaction;
  feeMap: FeeMap;
  signerOptions?: Partial<SignerOptions>;
};
