import { useUnit } from 'effector-react';

import { Select } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ChainTitle } from '@entities/chain';
import { networkSelectorModel } from '../../model/network-selector-model';

export const NetworkSelector = () => {
  const { t } = useI18n();

  const governanceChain = useUnit(networkSelectorModel.$governanceChain);
  const governanceChains = useUnit(networkSelectorModel.$governanceChains);

  const options = Object.values(governanceChains).map((chain) => ({
    id: chain.chainId,
    value: chain,
    element: <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />,
  }));

  return (
    <Select
      label={t('proxy.addProxy.networkLabel')}
      placeholder={t('proxy.addProxy.networkPlaceholder')}
      selectedId={governanceChain?.chainId}
      options={options}
      onChange={({ value }) => networkSelectorModel.events.chainChanged(value)}
    />
  );
};
