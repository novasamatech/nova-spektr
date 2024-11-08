import noop from 'lodash/noop';

import { type Chain, type ProxyAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { copyToClipboard, toAddress } from '@/shared/lib/utils';
import { DropdownIconButton, HelpText, IconButton } from '@/shared/ui';
import { type DropdownIconButtonOption } from '@/shared/ui/types';
import { ProxyAccount as ProxyAccountComponent } from '@/entities/proxy';
import { ExplorersPopover } from '@/entities/wallet';

type Props = {
  account: ProxyAccount;
  chain: Chain;
  canCreateProxy?: boolean;
  onRemoveProxy: (proxyAccount: ProxyAccount) => void;
};

export const ProxyAccountWithActions = ({ account, chain, canCreateProxy, onRemoveProxy }: Props) => {
  const { t } = useI18n();

  const proxiedAddress = toAddress(account.proxiedAccountId, { prefix: chain.addressPrefix });

  const forgetProxyAction: DropdownIconButtonOption = {
    icon: 'forget',
    title: t('walletDetails.common.removeProxyAction'),
    onClick: () => onRemoveProxy(account),
  };
  const openInfoAction: DropdownIconButtonOption = {
    icon: 'info',
    title: t('walletDetails.common.openInfoAction'),
    onClick: () => noop(),
  };

  return (
    <ProxyAccountComponent
      accountId={account.accountId}
      proxyType={account.proxyType}
      addressPrefix={chain?.addressPrefix}
      suffix={
        <DropdownIconButton name="more" className="ml-2">
          <DropdownIconButton.Items>
            <DropdownIconButton.Item>
              <ExplorersPopover
                address={account.accountId}
                explorers={chain.explorers}
                addressPrefix={chain.addressPrefix}
                className="-mr-1 -mt-10"
                button={<DropdownIconButton.Option option={openInfoAction} />}
              >
                <ExplorersPopover.Group title={t('walletDetails.common.proxiedAddressTitle')}>
                  <div className="flex items-center gap-x-2">
                    <HelpText className="break-all text-text-secondary">{proxiedAddress}</HelpText>
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
      }
    />
  );
};
