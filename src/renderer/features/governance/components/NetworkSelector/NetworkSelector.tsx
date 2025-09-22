import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { ChainSelect } from '@/shared/ui-entities';
import { Field } from '@/shared/ui-kit';
import { networkSelectorModel } from '../../model/networkSelector';

export const NetworkSelector = () => {
  const { t } = useI18n();

  const governanceChain = useUnit(networkSelectorModel.$governanceChain);
  const governanceChains = useUnit(networkSelectorModel.$governanceChains);

  return (
    <Field text={t('proxy.addProxy.networkLabel')}>
      <ChainSelect
        placeholder={t('proxy.addProxy.networkPlaceholder')}
        value={governanceChain}
        options={governanceChains}
        onChange={(chain) => networkSelectorModel.events.selectNetwork(chain.chainId)}
      />
    </Field>
  );
};
