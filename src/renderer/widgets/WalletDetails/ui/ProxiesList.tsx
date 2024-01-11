import { groupBy } from 'lodash';

import { cnTw, copyToClipboard, toAddress } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { Accordion, DropdownIconButton, FootnoteText, HelpText, IconButton } from '@shared/ui';
import type { Chain, ID, ProxyAccount } from '@shared/core';
import { EmptyProxyList, ProxyAccount as ProxyAccountComponent } from '@entities/proxy';
import { ProxyChainGroup } from '@shared/core/types/proxy';
import { chainsService } from '@entities/network';
import { AssetBalance } from '@entities/asset';
import { DropdownIconButtonOption } from '@shared/ui/Dropdowns/common/types';
import { ExplorersPopover } from '@entities/wallet';
import { proxyUtils } from '@entities/proxy/lib/utils';

const getMockProxyChainGroups = (walletId: ID, chains: Chain[]): ProxyChainGroup[] => {
  return chains.map((chain) => ({
    id: 1,
    walletId: walletId,
    proxiedAccountId: '0x00',
    chainId: chain.chainId,
    totalDeposit: 2000000,
  }));
};

type Props = {
  walletId: ID;
  chains: Chain[];
  proxies: ProxyAccount[];
  canCreateProxy?: boolean;
  className?: string;
};

export const ProxiesList = ({ proxies, chains, walletId, className, canCreateProxy = true }: Props) => {
  const { t } = useI18n();

  if (!proxies || !proxies.length) return <EmptyProxyList />;

  const proxiesByChain = groupBy(proxyUtils.sortAccountsByProxyType(proxies), 'chainId');

  const proxyChainGroups = getMockProxyChainGroups(walletId, chains); // TODO get it from effector model when it's ready

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
              explorers={chain.explorers || []}
              addressPrefix={chain.addressPrefix}
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

          const chain = chainsService.getChainById(chainId);

          if (!chain || !proxiesByChain[chainId] || !proxiesByChain[chainId].length) return;

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
                        value={totalDeposit.toString()}
                        asset={chain?.assets[0]}
                        showIcon={false}
                        className="text-help-text"
                      />
                    </HelpText>
                  </div>
                </Accordion.Button>
                <Accordion.Content>
                  <ul className="flex flex-col gap-y-2">
                    {(proxiesByChain[chainId] || []).map((proxy) => (
                      <li className="px-2 py-1.5" key={proxy.accountId}>
                        <ProxyAccountComponent
                          accountId={proxy.accountId}
                          proxyType={proxy.proxyType}
                          addressPrefix={chain?.addressPrefix}
                          actionButton={getProxyActionButton(proxy, chain)}
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
