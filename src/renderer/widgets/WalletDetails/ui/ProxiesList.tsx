import { groupBy } from 'lodash';
import { useUnit } from 'effector-react';

import { cnTw, copyToClipboard, toAddress } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { Accordion, DropdownIconButton, FootnoteText, HelpText, IconButton } from '@shared/ui';
import type { Chain, ID, ProxyAccount } from '@shared/core';
import { ProxyAccount as ProxyAccountComponent, proxyModel } from '@entities/proxy';
import { networkModel } from '@entities/network';
import { AssetBalance } from '@entities/asset';
import { DropdownIconButtonOption } from '@shared/ui/Dropdowns/common/types';
import { ExplorersPopover } from '@entities/wallet';
import { walletProviderModel } from '../model/wallet-provider-model';

type Props = {
  walletId: ID;
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ walletId, className, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  const proxyAccounts = useUnit(walletProviderModel.$proxyAccounts);
  const proxyChainGroups = useUnit(proxyModel.$proxyChainGroupStore)[walletId];

  const chains = useUnit(networkModel.$chains);

  const proxiesByChain = groupBy(proxyAccounts, 'chainId');

  const forgetProxyAction: DropdownIconButtonOption = {
    icon: 'forget',
    title: t('walletDetails.common.removeProxyAction'),
    onClick: () => {},
  };
  const openInfoAction: DropdownIconButtonOption = {
    icon: 'info',
    title: t('walletDetails.common.openInfoAction'),
    onClick: () => {},
  };

  const getProxyActionButton = (proxyAccount: ProxyAccount, chain: Chain) => {
    const proxiedAddress = toAddress(proxyAccount.proxiedAccountId, { prefix: chain.addressPrefix });

    return (
      <DropdownIconButton name="more" className="ml-2">
        <DropdownIconButton.Items>
          <DropdownIconButton.Item>
            <ExplorersPopover
              address={proxyAccount.accountId}
              explorers={chain.explorers}
              addressPrefix={chain.addressPrefix}
              className="-mt-10 -mr-1"
              button={<DropdownIconButton.Option option={openInfoAction} />}
            >
              <ExplorersPopover.Group title={t('walletDetails.common.proxiedAddressTitle')}>
                <div className="flex items-center gap-x-2">
                  <HelpText className="text-text-secondary break-all">{proxiedAddress}</HelpText>
                  <IconButton
                    className="shrink-0"
                    name="copy"
                    size={20}
                    onClick={() => copyToClipboard(proxiedAddress)}
                  />
                </div>
              </ExplorersPopover.Group>
            </ExplorersPopover>
          </DropdownIconButton.Item>
          {canCreateProxy && (
            <DropdownIconButton.Item>
              <DropdownIconButton.Option option={forgetProxyAction} />
            </DropdownIconButton.Item>
          )}
        </DropdownIconButton.Items>
      </DropdownIconButton>
    );
  };

  return (
    <div className={cnTw('flex flex-col', className)}>
      <div className="flex items-center px-5 pb-2">
        <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className="flex flex-col px-5 divide-y divide-divider overflow-y-auto overflow-x-hidden">
        {proxyChainGroups.map((chainGroup) => {
          const { chainId, totalDeposit } = chainGroup;

          const chain = chains[chainId];

          if (!proxiesByChain[chainId] || !proxiesByChain[chainId].length) return;

          return (
            <li key={chainId} className="flex items-center py-2">
              <Accordion isDefaultOpen>
                <Accordion.Button buttonClass="p-2 rounded hover:bg-action-background-hover focus:bg-action-background-hover">
                  <div className="flex gap-x-2 items-center justify-between flex-1 pr-2">
                    <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chain} />
                    <HelpText className="text-text-tertiary">
                      {t('walletDetails.common.proxyDeposit')}
                      &nbsp;
                      <AssetBalance
                        value={totalDeposit}
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
                        <ProxyAccountComponent
                          accountId={proxy.accountId}
                          proxyType={proxy.proxyType}
                          addressPrefix={chain?.addressPrefix}
                          suffix={getProxyActionButton(proxy, chain)}
                        />
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
