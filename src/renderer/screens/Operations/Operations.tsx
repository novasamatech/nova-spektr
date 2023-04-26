import { useState } from 'react';
import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { Block, Plate, Select, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';
import { MultisigTransactionDS } from '@renderer/services/storage';
import EmptyOperations from './components/EmptyState/EmptyOperations';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useAccount } from '@renderer/services/account/accountService';
import { nonNullable } from '@renderer/shared/utils/functions';
import { MultisigAccount } from '@renderer/domain/account';
import Operation from './components/Operation';
import { UNKNOWN_TYPE, getStatusOptions, getTransactionOptions, sortByDate, TransferTypes } from './common/utils';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { MultisigTransaction, MultisigTxStatus, TransactionType } from '@renderer/domain/transaction';
import { useNetworkContext } from '@renderer/context/NetworkContext';

const Operations = () => {
  const { t, dateLocale } = useI18n();
  const { connections } = useNetworkContext();

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
  const accountsMap = new Map(accounts.map((account) => [account.accountId, account as MultisigAccount]));
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

  const filteredTxs = txs.filter((t) => filterByStatuses(t) && filterByNetworks(t) && filterByTransactionTypes(t));

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

  const groupedTxs = groupBy(filteredTxs, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <div className="h-full flex flex-col gap-y-9 relative">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <h1 className="font-semibold text-2xl text-neutral"> {t('operations.title')}</h1>
      </div>

      <div className="overflow-y-auto flex-1">
        <Plate as="section" className="mx-auto w-[800px]">
          <h2 className="text-lg font-bold mb-4">{t('operations.subTitle')}</h2>

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

          {txs.length ? (
            Object.entries(groupedTxs)
              .sort(sortByDate)
              .map(([date, txs]) => (
                <div key={date}>
                  <div className="text-shade-30">{date}</div>
                  <Block className="p-1.5">
                    <Table by="id" dataSource={txs.sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))}>
                      <Table.Header hidden={true}>
                        <Table.Column width={100} dataKey="dateCreated" align="left" />
                        <Table.Column dataKey="callData" align="left" />
                        <Table.Column dataKey="transaction" align="right" />
                        <Table.Column width={100} dataKey="chainId" align="left" />
                        <Table.Column width={150} dataKey="signatories" align="right" />
                        <Table.Column width={20} dataKey="chevron" align="right" />
                      </Table.Header>

                      <Table.Body<MultisigTransactionDS>>
                        {(tx) => <Operation key={tx.id} tx={tx} account={accountsMap.get(tx.accountId)} />}
                      </Table.Body>
                    </Table>
                  </Block>
                </div>
              ))
          ) : (
            <EmptyOperations />
          )}
        </Plate>
      </div>
    </div>
  );
};

export default Operations;
