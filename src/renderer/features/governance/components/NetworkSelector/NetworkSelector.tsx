import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Field, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkSelectorModel } from '../../model/networkSelector';

export const NetworkSelector = () => {
  const { t } = useI18n();

  const governanceChainId = useUnit(networkSelectorModel.$governanceChainId);
  const governanceChains = useUnit(networkSelectorModel.$governanceChains);

  return (
    <Field text={t('proxy.addProxy.networkLabel')}>
      <Select
        placeholder={t('proxy.addProxy.networkPlaceholder')}
        value={governanceChainId}
        onChange={networkSelectorModel.events.selectNetwork}
      >
        {Object.values(governanceChains).map((chain) => (
          <Select.Item key={chain.chainId} value={chain.chainId}>
            <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />
          </Select.Item>
        ))}
      </Select>
    </Field>
  );
};
