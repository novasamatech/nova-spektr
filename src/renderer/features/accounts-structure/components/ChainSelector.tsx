import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Select } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { accountsStructureModel } from '../model/accountsStructureModel';

export const ChainSelector = () => {
  const { t } = useI18n();

  const selectedChainId = useUnit(accountsStructureModel.$selectedChainId);
  const allChains = useUnit(accountsStructureModel.$availableChains);
  const selectedAccount = useUnit(accountsStructureModel.$selectedAccount);

  const availableChains = selectedAccount
    ? allChains.filter((chain) => accountService.isAccountAvailableOnChain(selectedAccount, chain))
    : allChains;

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
