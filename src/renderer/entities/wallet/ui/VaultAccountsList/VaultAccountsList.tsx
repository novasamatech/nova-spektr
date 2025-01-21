import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText, IconButton } from '@/shared/ui';
import { Accordion, Box, Popover } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { accountUtils } from '../../lib/account-utils';
import { DerivedAccount } from '../Cards/DerivedAccount';

type Props = {
  chains: Chain[];
  accountsMap: Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
  className?: string;
  onShardClick?: (shards: VaultShardAccount[]) => void;
};

export const VaultAccountsList = ({ chains, accountsMap, className, onShardClick }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      <FootnoteText className="mb-1 pl-10 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>

      {chains.map((chain) => {
        if (!accountsMap[chain.chainId]) return;

        return (
          <div key={chain.chainId} className="pe-1 ps-8">
            <Accordion initialOpen>
              <Accordion.Trigger>
                <span className="normal-case">
                  <ChainTitle fontClass="text-text-primary" chain={chain} />
                </span>
                <FootnoteText className="text-text-tertiary">{accountsMap[chain.chainId].length}</FootnoteText>
              </Accordion.Trigger>
              <Accordion.Content>
                <ul>
                  {accountsMap[chain.chainId].map((account) => {
                    const isSharded = accountUtils.isAccountWithShards(account);

                    return (
                      <li className="mb-2 last:mb-0" key={accountUtils.getDerivationPath(account)}>
                        <DerivedAccount
                          account={account}
                          addressPrefix={chain.addressPrefix}
                          onClick={isSharded ? () => onShardClick?.(account) : undefined}
                        >
                          <Popover side="bottom" align="end">
                            <Popover.Trigger>
                              <IconButton name="details" />
                            </Popover.Trigger>
                            <Popover.Content>
                              <Box gap={0.5} padding={4} width="230px">
                                <FootnoteText className="text-text-tertiary">
                                  {t('general.explorers.derivationTitle')}
                                </FootnoteText>
                                <HelpText className="break-all text-text-secondary">
                                  {accountUtils.getDerivationPath(account)}
                                </HelpText>
                              </Box>
                            </Popover.Content>
                          </Popover>
                        </DerivedAccount>
                      </li>
                    );
                  })}
                </ul>

                <hr className="my-1 w-full border-divider" />
              </Accordion.Content>
            </Accordion>
          </div>
        );
      })}
    </div>
  );
};
