import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';

import { type Address, type Asset, type Chain } from '@/shared/core';
import { getNativeAsset } from '@/shared/lib/utils';
import { type TxConfirmInfo, createTransactionConfirmStore, createTxValidationStore } from '@/shared/transactions';
import { type BalancePreservation } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { transferValidator } from '@/features/operations/OperationsValidation';

export type TransferConfirmStore = TxConfirmInfo & {
  destinationChain: Chain;
  asset: Asset;
  amount: string;
  rawAmount: string;
  destination: Address;

  fee: BN;
  originFee: BN;
  destinationFee: BN | null;
  multisigDeposit: BN;
  balancePreservation: BalancePreservation;
};

const { $confirmMap, $confirms, $isMultisigExists, init, startSigning } =
  createTransactionConfirmStore<TransferConfirmStore>({
    $apis: networkModel.$apis,
    $wallets: walletModel.$wallets,
    $multisigTransactions: selectedWalletMultisigOperations.$list,
  });

const confirmed = createEvent();

const $currentConfirm = $confirmMap.map((store) => store?.[0]?.meta ?? null);

const $api = combine({ apis: networkModel.$apis, confirm: $currentConfirm }, ({ apis, confirm }) => {
  if (!confirm?.chain) return null;
  return apis[confirm.chain.chainId] ?? null;
});

const $sourceChain = $currentConfirm.map((confirm) => confirm?.chain ?? null);
const $sourceAsset = $currentConfirm.map((confirm) => confirm?.asset ?? null);
const $destinationChain = $currentConfirm.map((confirm) => confirm?.destinationChain ?? null);
const $asset = $currentConfirm.map((confirm) => (confirm?.chain ? getNativeAsset(confirm.chain.assets) : null));
const $amount = $currentConfirm.map((confirm) => new BN(confirm?.amount ?? '0'));
const $route = $currentConfirm.map((confirm) => confirm?.route ?? []);
const $transaction = $currentConfirm.map((confirm) => confirm?.tx ?? null);
const $originFeeFromConfirm = $currentConfirm.map((confirm) => confirm?.originFee ?? new BN(0));
const $destinationFeeFromConfirm = $currentConfirm.map((confirm) => confirm?.destinationFee ?? new BN(0));
const $balancePreservation = $currentConfirm.map((confirm) => confirm?.balancePreservation ?? false);

const $isXcm = combine(
  {
    sourceChain: $sourceChain,
    destinationChain: $destinationChain,
  },
  ({ sourceChain, destinationChain }) => {
    return sourceChain && destinationChain && sourceChain.chainId !== destinationChain.chainId;
  },
);

const $originFee = combine(
  {
    isXcm: $isXcm,
    originFee: $originFeeFromConfirm,
  },
  ({ isXcm, originFee }) => {
    // For regular transfers, use BN_ZERO so XCM validation rules don't apply
    return isXcm ? originFee : new BN(0);
  },
);

const $destinationFee = combine(
  {
    isXcm: $isXcm,
    destinationFee: $destinationFeeFromConfirm,
  },
  ({ isXcm, destinationFee }) => {
    // For XCM transfers, destinationFee represents the destination fee
    // For regular transfers, use BN_ZERO so XCM validation rules don't apply
    return isXcm ? (destinationFee ?? new BN(0)) : new BN(0);
  },
);

const { $errors: $validationErrors, $valid: $canSubmit } = createTxValidationStore({
  validator: transferValidator,
  params: {
    api: $api,
    sourceChain: $sourceChain,
    sourceAsset: $sourceAsset,
    destinationChain: $destinationChain,
    asset: $asset,
    amount: $amount,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $transaction,
    originFee: $originFee,
    destinationFee: $destinationFee,
    balancePreservation: $balancePreservation,
    excludeActions: combine($isXcm, (isXcm) => (isXcm ? ['fee'] : [])),
    dryRunResult: createStore({ success: true }),
  },
});

sample({
  clock: startSigning,
  target: confirmed,
});

export const confirmModel = {
  $confirmMap,
  $confirms,
  $isMultisigExists,
  $validationErrors,
  $canSubmit,

  init,
  startSigning,
  confirmed,
};
