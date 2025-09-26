import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { FootnoteText, HelpText, IconButton, Separator } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Copy, Dropdown, Popover } from '@/shared/ui-kit';
import { ProxyAccount as ProxyAccountComponent } from '@/entities/proxy';
import { type Proxy } from '../../model/wallet-proxies-model';

type Props = {
  account: Proxy;
  chain: Chain;
  canCreateProxy?: boolean;
  onRemoveProxy: (proxyAccount: Proxy) => void;
};

export const ProxyAccountWithActions = ({ account, chain, canCreateProxy, onRemoveProxy }: Props) => {
  const { t } = useI18n();

  const proxyAddress = toAddress(account.accountId, { prefix: chain.addressPrefix });
  const proxiedAddress = toAddress(account.proxiedAccountId, { prefix: chain.addressPrefix });

  return (
    <ProxyAccountComponent
      accountId={account.accountId}
      proxyType={account.proxyType}
      addressPrefix={chain?.addressPrefix}
      suffix={
        <Dropdown>
          <Dropdown.Trigger>
            <IconButton name="more" className="ml-2" />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item>
              <div
                className="w-full"
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <Popover align="end" side="bottom">
                  <Popover.Trigger>
                    <button className="flex w-full items-center gap-x-1">
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
                        <Copy value={proxyAddress} notification={t('general.notifications.addressCopied')}>
                          <IconButton className="shrink-0" name="copy" size={20} />
                        </Copy>
                      </Box>

                      <Separator />

                      <FootnoteText className="text-text-tertiary">
                        {t('walletDetails.common.proxiedAddressTitle')}
                      </FootnoteText>
                      <Box direction="row" verticalAlign="center" gap={3}>
                        <HelpText className="text-text-secondary">
                          <Address address={proxiedAddress} variant="full" />
                        </HelpText>
                        <Copy value={proxiedAddress} notification={t('general.notifications.addressCopied')}>
                          <IconButton className="shrink-0" name="copy" size={20} />
                        </Copy>
                      </Box>
                    </Box>
                  </Popover.Content>
                </Popover>
              </div>
            </Dropdown.Item>
            {canCreateProxy && (
              <Dropdown.Item onSelect={() => onRemoveProxy(account)}>
                <IconButton name="forget" size={20} className="text-icon-accent" />
                <FootnoteText className="text-text-secondary">
                  {t('walletDetails.common.removeProxyAction')}
                </FootnoteText>
              </Dropdown.Item>
            )}
          </Dropdown.Content>
        </Dropdown>
      }
    />
  );
};
