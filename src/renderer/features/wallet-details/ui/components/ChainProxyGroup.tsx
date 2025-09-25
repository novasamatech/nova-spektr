import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { HelpText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Accordion } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { type Proxy } from '../../model/wallet-proxies-model';

import { ProxyAccountWithActions } from './ProxyAccountWithActions';

type Props = {
  chain: Chain;
  proxies: Proxy[];
  totalDeposit: string;
  canCreateProxy?: boolean;
  onRemoveProxy: (proxyAccount: Proxy) => void;
};

export const ChainProxyGroup = ({ chain, proxies, totalDeposit, canCreateProxy, onRemoveProxy }: Props) => {
  const { t } = useI18n();

  return (
    <li className="flex items-center py-2">
      <Accordion initialOpen>
        <Accordion.Trigger>
          <div className="flex items-center justify-between gap-x-2 pr-2 normal-case">
            <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chain} />
            <HelpText className="text-text-tertiary">
              {t('walletDetails.common.proxyDeposit')}
              &nbsp;
              <AssetBalance
                value={totalDeposit.replaceAll(',', '')}
                asset={chain.assets[0]}
                className="text-help-text"
              />
            </HelpText>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <ul className="flex flex-col gap-y-2">
            {proxies.map(proxy => (
              <li className="px-2 py-1.5" key={`${proxy.accountId}_${proxy.proxyType}_${proxy.proxiedAccountId}`}>
                <ProxyAccountWithActions
                  account={proxy}
                  chain={chain}
                  canCreateProxy={canCreateProxy}
                  onRemoveProxy={onRemoveProxy}
                />
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </li>
  );
};
