import { type Chain, type ProxyAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { copyToClipboard, toAddress } from '@/shared/lib/utils';
import { DropdownIconButton, FootnoteText, HelpText, IconButton, Separator } from '@/shared/ui';
import { type DropdownIconButtonOption } from '@/shared/ui/types';
import { Address } from '@/shared/ui-entities';
import { Box, Popover } from '@/shared/ui-kit';
import { ProxyAccount as ProxyAccountComponent } from '@/entities/proxy';

type Props = {
  account: ProxyAccount;
  chain: Chain;
  canCreateProxy?: boolean;
  onRemoveProxy: (proxyAccount: ProxyAccount) => void;
};

export const ProxyAccountWithActions = ({ account, chain, canCreateProxy, onRemoveProxy }: Props) => {
  const { t } = useI18n();

  const proxyAddress = toAddress(account.accountId, { prefix: chain.addressPrefix });
  const proxiedAddress = toAddress(account.proxiedAccountId, { prefix: chain.addressPrefix });

  const forgetProxyAction: DropdownIconButtonOption = {
    icon: 'forget',
    title: t('walletDetails.common.removeProxyAction'),
    onClick: () => onRemoveProxy(account),
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
              {/* hack to override dropdown hide on click */}
              <div onClick={e => e.stopPropagation()}>
                <Popover align="end" side="bottom">
                  <Popover.Trigger>
                    <button className="flex items-center gap-x-1 py-2 pl-2">
                      <IconButton name="info" size={20} className="text-icon-accent" />
                      <FootnoteText className="text-text-secondary">
                        {t('walletDetails.common.openInfoAction')}
                      </FootnoteText>
                    </button>
                  </Popover.Trigger>
                  <Popover.Content>
                    <Box width="230px" gap={2} padding={4}>
                      <FootnoteText className="text-text-tertiary">{t('general.explorers.addressTitle')}</FootnoteText>
                      <Box direction="row" verticalAlign="center" gap={3}>
                        <HelpText className="text-text-secondary">
                          <Address address={proxyAddress} variant="full" />
                        </HelpText>
                        <IconButton
                          className="shrink-0"
                          name="copy"
                          size={20}
                          onClick={() => copyToClipboard(proxyAddress)}
                        />
                      </Box>

                      <Separator />

                      <FootnoteText className="text-text-tertiary">
                        {t('walletDetails.common.proxiedAddressTitle')}
                      </FootnoteText>
                      <Box direction="row" verticalAlign="center" gap={3}>
                        <HelpText className="text-text-secondary">
                          <Address address={proxiedAddress} variant="full" />
                        </HelpText>
                        <IconButton
                          className="shrink-0"
                          name="copy"
                          size={20}
                          onClick={() => copyToClipboard(proxiedAddress)}
                        />
                      </Box>
                    </Box>
                  </Popover.Content>
                </Popover>
              </div>
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
