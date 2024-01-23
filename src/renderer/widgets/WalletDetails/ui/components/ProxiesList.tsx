import { groupBy } from 'lodash';
import { useUnit } from 'effector-react';

import { cnTw } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { Accordion, FootnoteText, HelpText } from '@shared/ui';
import type { ID } from '@shared/core';
import { proxyModel } from '@entities/proxy';
import { networkModel } from '@entities/network';
import { AssetBalance } from '@entities/asset';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { ProxyAccountWithActions } from './ProxyAccountWithActions';

type Props = {
  walletId: ID;
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ walletId, className, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  const proxyAccounts = useUnit(walletProviderModel.$proxyAccounts);
  const proxyGroups = useUnit(proxyModel.$walletsProxyGroups);

  console.log('proxyGroups', proxyGroups)

  const chains = useUnit(networkModel.$chains);

  const proxiesByChain = groupBy(proxyAccounts, 'chainId');

  return (
    <div className={cnTw('flex flex-col', className)}>
      <div className="flex items-center px-5 pb-2">
        <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className="flex flex-col px-5 divide-y divide-divider overflow-y-auto overflow-x-hidden h-[inherit]">
        {(proxyGroups[walletId] || []).map((chainGroup) => {
          const { chainId, totalDeposit } = chainGroup;

          const chain = chains[chainId];

          if (!proxiesByChain[chainId] || !proxiesByChain[chainId].length) return;

          return (
            <li key={chainId} className="flex items-center py-2">
              <Accordion isDefaultOpen>
                <Accordion.Button buttonClass="p-2 rounded hover:bg-action-background-hover focus:bg-action-background-hover">
                  <div className="flex gap-x-2 items-center justify-between pr-2">
                    <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chain} />
                    <HelpText className="text-text-tertiary">
                      {t('walletDetails.common.proxyDeposit')}
                      &nbsp;
                      <AssetBalance
                        value={totalDeposit.replaceAll(',', '')}
                        asset={chain.assets[0]}
                        showIcon={false}
                        className="text-help-text"
                      />
                    </HelpText>
                  </div>
                </Accordion.Button>
                <Accordion.Content>
                  <ul className="flex flex-col gap-y-2">
                    {proxiesByChain[chainId].map((proxy) => (
                      <li className="px-2 py-1.5" key={proxy.accountId}>
                        <ProxyAccountWithActions account={proxy} chain={chain} canCreateProxy={canCreateProxy} />
                      </li>
                    ))}
                  </ul>
                </Accordion.Content>
              </Accordion>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
