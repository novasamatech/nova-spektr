import { type TFunction } from 'i18next';

import { type BasketTransaction, type Chain, TransactionType } from '@/shared/core';
import { type DropdownOption, type DropdownResult } from '@/shared/ui/types';
import { XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { type SelectedFilters } from '../common/types';

import { TransferTypes, TxStatus, UNKNOWN_TYPE } from './constants';

export const getStatusOptions = (t: TFunction) => {
  return [
    {
      id: TxStatus.VALID,
      value: TxStatus.VALID,
      element: t('basket.filter.valid'),
    },
    {
      id: TxStatus.FAILED,
      value: TxStatus.FAILED,
      element: t('basket.filter.failed'),
    },
    {
      id: TxStatus.UNAVAILABLE,
      value: TxStatus.UNAVAILABLE,
      element: t('basket.filter.unavailable'),
    },
  ];
};

export const getTransactionOptions = (t: TFunction) => {
  return [
    {
      id: TransactionType.TRANSFER,
      value: TransactionType.TRANSFER,
      element: t('operations.titles.transfer'),
    },
    {
      id: TransactionType.XCM_LIMITED_TRANSFER,
      value: TransactionType.XCM_LIMITED_TRANSFER,
      element: t('operations.titles.crossChainTransfer'),
    },
    {
      id: TransactionType.BOND,
      value: TransactionType.BOND,
      element: t('operations.titles.startStaking'),
    },
    {
      id: TransactionType.STAKE_MORE,
      value: TransactionType.STAKE_MORE,
      element: t('operations.titles.stakeMore'),
    },
    {
      id: TransactionType.DESTINATION,
      value: TransactionType.DESTINATION,
      element: t('operations.titles.destination'),
    },
    {
      id: TransactionType.NOMINATE,
      value: TransactionType.NOMINATE,
      element: t('operations.titles.nominate'),
    },
    {
      id: TransactionType.REDEEM,
      value: TransactionType.REDEEM,
      element: t('operations.titles.redeem'),
    },
    {
      id: TransactionType.RESTAKE,
      value: TransactionType.RESTAKE,
      element: t('operations.titles.restake'),
    },
    {
      id: TransactionType.UNSTAKE,
      value: TransactionType.UNSTAKE,
      element: t('operations.titles.unstake'),
    },
    {
      id: TransactionType.ADD_PROXY,
      value: TransactionType.ADD_PROXY,
      element: t('operations.titles.addProxy'),
    },
    {
      id: TransactionType.REMOVE_PROXY,
      value: TransactionType.REMOVE_PROXY,
      element: t('operations.titles.removeProxy'),
    },
    {
      id: TransactionType.CREATE_PURE_PROXY,
      value: TransactionType.CREATE_PURE_PROXY,
      element: t('operations.titles.createPureProxy'),
    },
    {
      id: TransactionType.REMOVE_PURE_PROXY,
      value: TransactionType.REMOVE_PURE_PROXY,
      element: t('operations.titles.removePureProxy'),
    },
    {
      id: TransactionType.UNLOCK,
      value: TransactionType.UNLOCK,
      element: t('operations.titles.unlock'),
    },
    {
      id: TransactionType.VOTE,
      value: TransactionType.VOTE,
      element: t('operations.titles.vote'),
    },
    {
      id: TransactionType.REVOTE,
      value: TransactionType.REVOTE,
      element: t('operations.titles.revote'),
    },
    {
      id: TransactionType.REMOVE_VOTE,
      value: TransactionType.REMOVE_VOTE,
      element: t('operations.titles.removeVote'),
    },
    {
      id: TransactionType.DELEGATE,
      value: TransactionType.DELEGATE,
      element: t('operations.titles.delegate'),
    },
    {
      id: TransactionType.UNDELEGATE,
      value: TransactionType.UNDELEGATE,
      element: t('operations.titles.undelegate'),
    },
    {
      id: UNKNOWN_TYPE,
      value: UNKNOWN_TYPE,
      element: t('operations.titles.unknown'),
    },
  ];
};

const mapValues = (result: DropdownResult) => result.value;

const getTxStatus = (tx: BasketTransaction, isUnavailable: boolean) => {
  if (isUnavailable) return TxStatus.UNAVAILABLE;
  if (tx.error) return TxStatus.FAILED;

  return TxStatus.VALID;
};

export const filterTx = (tx: BasketTransaction, invalidTxs: number[], filters: SelectedFilters) => {
  const xcmDestination = tx.coreTx?.args.destinationChain;

  const hasStatus =
    !filters.status.length || filters.status.map(mapValues).includes(getTxStatus(tx, invalidTxs.includes(tx.id)));
  const hasOrigin = !filters.network.length || filters.network.map(mapValues).includes(tx.coreTx.chainId);
  const hasDestination = !filters.network.length || filters.network.map(mapValues).includes(xcmDestination);
  const hasTxType = !filters.type.length || filters.type.map(mapValues).includes(getFilterableTxType(tx));

  return hasStatus && (hasOrigin || hasDestination) && hasTxType;
};

export const getFilterableTxType = (tx: BasketTransaction): TransactionType | typeof UNKNOWN_TYPE => {
  if (!tx.coreTx?.type) return UNKNOWN_TYPE;

  if (TransferTypes.includes(tx.coreTx.type)) return TransactionType.TRANSFER;
  if (XcmTypes.includes(tx.coreTx.type)) return TransactionType.XCM_LIMITED_TRANSFER;

  if (tx.coreTx.type === TransactionType.BATCH_ALL) {
    const txMatch = findCoreBatchAll(tx.coreTx);

    return txMatch?.type || UNKNOWN_TYPE;
  }

  return tx.coreTx.type;
};

export const getAvailableFiltersOptions = (transactions: BasketTransaction[], chains: Chain[], t: TFunction) => {
  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);
  const NetworkOptions = chains.map(({ chainId, name }) => ({
    id: chainId,
    value: chainId,
    element: name,
  }));

  const options = transactions.reduce(
    (acc, tx) => {
      const txType = getFilterableTxType(tx);
      const xcmDestination = tx.coreTx?.args.destinationChain;

      const originNetworkOption = NetworkOptions.find((s) => s.value === tx.coreTx.chainId);
      const destNetworkOption = NetworkOptions.find((s) => s.value === xcmDestination);
      const typeOption = TransactionOptions.find((s) => s.value === txType);

      if (originNetworkOption) acc.network.add(originNetworkOption);
      if (destNetworkOption) acc.network.add(destNetworkOption);
      if (typeOption) acc.type.add(typeOption);

      return acc;
    },
    {
      network: new Set<DropdownOption>(),
      type: new Set<DropdownOption>(),
    },
  );

  return {
    ...options,
    status: new Set(StatusOptions),
  };
};
