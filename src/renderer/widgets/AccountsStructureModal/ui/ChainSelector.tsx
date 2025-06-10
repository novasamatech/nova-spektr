import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Select } from '@/shared/ui-kit';
import { type AnyAccount, accountService } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { accountsStructureModel } from '../model/accountsStructureModel';

type Props = {
  account: AnyAccount;
};

export const ChainSelector = ({ account }: Props) => {
  const { t } = useI18n();

  const selectedChainId = useUnit(accountsStructureModel.$selectedChainId);
  const allChains = useUnit(accountsStructureModel.$availableChains);

  const availableChains = allChains.filter((chain) => accountService.isAccountAvailableOnChain(account, chain));

  return (
    <Select
      placeholder={t('proxy.addProxy.networkPlaceholder')}
      value={selectedChainId}
      height="sm"
      onChange={accountsStructureModel.events.selectChain}
    >
      {availableChains.map((chain) => (
        <Select.Item key={chain.chainId} value={chain.chainId}>
          <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />
        </Select.Item>
      ))}
    </Select>
  );
};
