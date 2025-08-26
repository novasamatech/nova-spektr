import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { ChainSelect } from '@/shared/ui-entities';
import { accountsStructureModel } from '../model/accountsStructureModel';

export const ChainSelector = () => {
  const { t } = useI18n();

  const selectedChain = useUnit(accountsStructureModel.$selectedChain);
  const availableChains = useUnit(accountsStructureModel.$availableChains);

  return (
    <ChainSelect
      placeholder={t('proxy.addProxy.networkPlaceholder')}
      value={selectedChain}
      options={availableChains}
      onChange={accountsStructureModel.selectChain}
    />
  );
};
