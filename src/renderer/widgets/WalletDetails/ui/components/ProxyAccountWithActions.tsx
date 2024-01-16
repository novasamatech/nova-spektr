import { Chain, ProxyAccount } from '@shared/core';
import { ProxyAccount as ProxyAccountComponent } from '@entities/proxy';
import { copyToClipboard, toAddress } from '@shared/lib/utils';
import { DropdownIconButton, HelpText, IconButton } from '@shared/ui';
import { ExplorersPopover } from '@entities/wallet';
import { useI18n } from '@app/providers';
import { DropdownIconButtonOption } from '@shared/ui/Dropdowns/common/types';

type Props = {
  account: ProxyAccount;
  chain: Chain;
  canCreateProxy?: boolean;
};

export const ProxyAccountWithActions = ({ account, chain, canCreateProxy }: Props) => {
  const { t } = useI18n();

  const proxiedAddress = toAddress(account.proxiedAccountId, { prefix: chain.addressPrefix });

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
      }
    />
  );
};
