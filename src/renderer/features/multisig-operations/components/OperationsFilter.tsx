import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo, useMemo, useState } from 'react';

import { ProxyTypeOrder, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { Button, Icon, MultiSelect } from '@/shared/ui';
import { DateRangePicker, Select } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { type SignatureFilterValue, SIGNATURE_FILTER_ORDER } from '../lib/operations-filter';
import { STATUS_FILTER_LABEL_KEYS, STATUS_FILTER_ORDER, isStatusFilterValue } from '../lib/operations-sections';
import { operationsContextModel } from '../model/context';

export const OperationsFilter = memo(() => {
  const { t } = useI18n();

  const selectedOptions = useUnit(operationsContextModel.$filter);
  const isFiltersSelected = useUnit(operationsContextModel.$isFiltersSelected);
  const chainsList = useUnit(networkModel.$chainsList);

  const [networkSearchQuery, setNetworkSearchQuery] = useState('');
  const [typeSearchQuery, setTypeSearchQuery] = useState('');
  const [proxyTypeSearchQuery, setProxyTypeSearchQuery] = useState('');

  const TransactionOptions = getTransactionOptions(t);
  const StatusOptions = STATUS_FILTER_ORDER.map(status => ({
    id: status,
    value: status,
    element: t(STATUS_FILTER_LABEL_KEYS[status]),
  }));
  const NetworkOptions = chainsList.map(({ chainId, name }) => ({
    id: chainId,
    value: chainId,
    element: name,
  }));
  const ProxyTypeOptions = ProxyTypeOrder.map(type => ({
    id: type,
    value: type,
    element: type,
  }));

  const filtersOptions = useMemo(() => {
    const filteredNetworkOptions = performSearch({
      query: networkSearchQuery,
      records: NetworkOptions,
      weights: { element: 1 },
    });

    const filteredTypeOptions = performSearch({
      query: typeSearchQuery,
      records: TransactionOptions,
      weights: { element: 1 },
    });

    const filteredProxyTypeOptions = performSearch({
      query: proxyTypeSearchQuery,
      records: ProxyTypeOptions,
      weights: { element: 1 },
    });

    return {
      network: filteredNetworkOptions,
      type: filteredTypeOptions,
      proxyType: filteredProxyTypeOptions,
    };
  }, [NetworkOptions, TransactionOptions, ProxyTypeOptions, networkSearchQuery, typeSearchQuery, proxyTypeSearchQuery]);

  const clearFilters = () => {
    operationsContextModel.resetFilters();
  };

  return (
    <div className="flex h-9 items-center gap-2">
      {isFiltersSelected && (
        <Button
          variant="text"
          className="h-8.5 py-0"
          prefixElement={<Icon name="close" size={14} />}
          onClick={clearFilters}
        >
          {t('operations.filters.clearFilters')}
        </Button>
      )}
      <div className="w-[136px]">
        <DateRangePicker
          value={selectedOptions.dateRange}
          placeholder={t('operations.filters.dateRangePlaceholder')}
          onChange={range => operationsContextModel.setFilter({ dateRange: range })}
        />
      </div>
      <div className="w-[136px]">
        <Select
          placeholder={t('operations.filters.signaturePlaceholder')}
          value={selectedOptions.signature}
          onChange={value => operationsContextModel.setFilter({ signature: value })}
        >
          {SIGNATURE_FILTER_ORDER.map(value => (
            <Select.Item key={value} value={value}>
              {t(SIGNATURE_FILTER_LABEL_KEYS[value])}
            </Select.Item>
          ))}
        </Select>
      </div>
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.multisigStatusPlaceholder')}
        selectedIds={selectedOptions.status}
        options={StatusOptions}
        onChange={value =>
          operationsContextModel.setFilter({ status: value.map(v => v.id).filter(isStatusFilterValue) })
        }
      />
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.proxyTypePlaceholder')}
        selectedIds={selectedOptions.proxyType}
        options={[...filtersOptions.proxyType]}
        onChange={value => operationsContextModel.setFilter({ proxyType: value.map(v => v.id) })}
        onSearch={setProxyTypeSearchQuery}
      />
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.networkPlaceholder')}
        selectedIds={selectedOptions.network}
        options={[...filtersOptions.network]}
        onChange={value => operationsContextModel.setFilter({ network: value.map(v => v.id) })}
        onSearch={setNetworkSearchQuery}
      />
      <MultiSelect
        showSelectAll
        className="w-[136px]"
        placeholder={t('operations.filters.operationTypePlaceholder')}
        selectedIds={selectedOptions.type}
        options={[...filtersOptions.type]}
        onChange={value => operationsContextModel.setFilter({ type: value.map(v => v.id) })}
        onSearch={setTypeSearchQuery}
      />
    </div>
  );
});

const SIGNATURE_FILTER_LABEL_KEYS: Record<SignatureFilterValue, string> = {
  signed: 'operations.filters.signatureSigned',
  not_signed: 'operations.filters.signatureNotSigned',
};

const getTransactionOptions = (t: TFunction) => {
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
      id: TransactionType.KILL_PURE_PROXY,
      value: TransactionType.KILL_PURE_PROXY,
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
      id: 'UNKNOWN_TYPE',
      value: 'UNKNOWN_TYPE',
      element: t('operations.titles.unknown'),
    },
  ];
};
