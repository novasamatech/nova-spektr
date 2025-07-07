import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { accountsStructureModel } from '../model/accountsStructureModel';

export const ChainSelector = () => {
  const { t } = useI18n();

  const selectedChainId = useUnit(accountsStructureModel.$selectedChainId);
  const availableChains = useUnit(accountsStructureModel.$availableChains);

  return (
    <Select
      placeholder={t('proxy.addProxy.networkPlaceholder')}
      value={selectedChainId}
      height="sm"
      onChange={accountsStructureModel.selectChain}
    >
      {availableChains.map((chain) => (
        <Select.Item key={chain.chainId} value={chain.chainId}>
          <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />
        </Select.Item>
      ))}
    </Select>
  );
};
