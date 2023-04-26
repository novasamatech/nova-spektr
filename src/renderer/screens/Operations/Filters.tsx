import { useEffect, useState } from 'react';

import { Select } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { nonNullable } from '@renderer/shared/utils/functions';
import { UNKNOWN_TYPE, getStatusOptions, getTransactionOptions, TransferTypes } from './common/utils';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { MultisigTransaction, MultisigTxStatus, TransactionType } from '@renderer/domain/transaction';
import { useNetworkContext } from '@renderer/context/NetworkContext';

type Props = {
  onChangeFilters: (filteredTxs: MultisigTransaction[]) => void;
};

const Operations = ({ onChangeFilters }: Props) => {
  const { t } = useI18n();
  const { connections } = useNetworkContext();

  const [filteredTxs, setFilteredTxs] = useState<MultisigTransaction[]>([]);

  const StatusOptions = getStatusOptions(t);
  const TransactionOptions = getTransactionOptions(t);

  const NetworkOptions = Object.values(connections).map((c) => ({
    id: c.chainId,
    value: c.chainId,
    element: c.name,
  }));

  const { getActiveAccounts } = useAccount();
  const { getLiveAccountMultisigTxs } = useMultisigTx();

  const [activeNetworks, setActiveNetworks] = useState<DropdownResult<ChainId>[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<DropdownResult<MultisigTxStatus>[]>([]);
  const [activeOperationTypes, setActiveOperationTypes] = useState<
    DropdownResult<TransactionType | typeof UNKNOWN_TYPE>[]
  >([]);

  const accounts = getActiveAccounts({ signingType: SigningType.MULTISIG });
  const accountIds = accounts.map((a) => a.accountId).filter(nonNullable);

  const txs = getLiveAccountMultisigTxs(accountIds);

  const activeStatusesValues = activeStatuses.map((t) => t.value);
  const activeNetworksValues = activeNetworks.map((t) => t.value);
  const activeOperationTypesValues = activeOperationTypes.map((t) => t.value);

  const getFilterableType = (tx: MultisigTransaction): TransactionType | typeof UNKNOWN_TYPE => {
    let filterableType: TransactionType | typeof UNKNOWN_TYPE = UNKNOWN_TYPE;

    if (tx.transaction) {
      if (TransferTypes.includes(tx.transaction.type)) {
        filterableType = TransactionType.TRANSFER;
      } else if (tx.transaction.type === TransactionType.BATCH_ALL) {
        filterableType = tx.transaction.args?.transactions?.[0]?.type;
      } else {
        filterableType = tx.transaction?.type;
      }
    }

    return filterableType;
  };

  const filterByStatuses = (t: MultisigTransaction) =>
    !activeStatuses.length || activeStatusesValues.includes(t.status);
  const filterByNetworks = (t: MultisigTransaction) =>
    !activeNetworks.length || activeNetworksValues.includes(t.chainId);
  const filterByTransactionTypes = (t: MultisigTransaction) =>
    !activeOperationTypes.length || activeOperationTypesValues.includes(getFilterableType(t));

  useEffect(() => {
    const filtered = txs.filter((t) => filterByStatuses(t) && filterByNetworks(t) && filterByTransactionTypes(t));

    onChangeFilters(filtered);
    setFilteredTxs(filtered);
  }, [txs.length, activeStatusesValues.length, activeNetworksValues.length, activeOperationTypesValues.length]);

  const getTransactionTypeOption = (tx: MultisigTransactionDS) => {
    return TransactionOptions.find((s) => s.value === getFilterableType(tx));
  };

  const { statusOptions, networkOptions, typeOptions } = filteredTxs.reduce(
    (acc, tx) => {
      const statusOption = StatusOptions.find((s) => s.value === tx.status);
      const networkOption = NetworkOptions.find((s) => s.value === tx.chainId);
      const typeOption = getTransactionTypeOption(tx);

      if (statusOption) acc.statusOptions.add(statusOption);
      if (networkOption) acc.networkOptions.add(networkOption);
      if (typeOption) acc.typeOptions.add(typeOption);

      return acc;
    },
    {
      statusOptions: new Set<DropdownOption>(),
      networkOptions: new Set<DropdownOption>(),
      typeOptions: new Set<DropdownOption>(),
    },
  );

  return (
    <div className="flex gap-2 my-4">
      <Select
        className="w-[200px]"
        placeholder={t('operations.filters.statusPlaceholder')}
        summary={t('operations.filters.statusSummary')}
        activeIds={activeStatuses.map(({ id }) => id)}
        options={[...statusOptions]}
        onChange={setActiveStatuses}
      />
      <Select
        className="w-[200px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        summary={t('operations.filters.networkSummary')}
        activeIds={activeNetworks.map(({ id }) => id)}
        options={[...networkOptions]}
        onChange={setActiveNetworks}
      />
      <Select
        className="w-[200px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        summary={t('operations.filters.operationTypeSummary')}
        activeIds={activeOperationTypes.map(({ id }) => id)}
        options={[...typeOptions]}
        onChange={setActiveOperationTypes}
      />
    </div>
  );
};

export default Operations;
