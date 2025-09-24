import { BN } from '@polkadot/util';
import { combine, createEvent, sample } from 'effector';

import { type Address, type Asset, type Chain } from '@/shared/core';
import { getNativeAsset } from '@/shared/lib/utils';
import { type TxConfirmInfo, createTransactionConfirmStore, createTxValidationStore } from '@/shared/transactions';
import { accountService } from '@/domains/network';
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
  xcmFee: BN;
  deliveryFee: BN;
  multisigDeposit: BN;
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
const $amount = $currentConfirm.map((confirm) => confirm?.rawAmount ?? '0');
const $route = $currentConfirm.map((confirm) => confirm?.route ?? []);
const $transaction = $currentConfirm.map((confirm) => confirm?.tx ?? null);
const $xcmFee = $currentConfirm.map((confirm) => confirm?.xcmFee ?? new BN(0));
const $deliveryFee = $currentConfirm.map((confirm) => confirm?.deliveryFee ?? new BN(0));

const { $errors: $validationErrors } = createTxValidationStore({
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
    xcmFee: $xcmFee,
    deliveryFee: $deliveryFee,
  },
});

const $canSubmit = $validationErrors.map((errors) => !accountService.hasTransactionValidationErrors(errors));

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
