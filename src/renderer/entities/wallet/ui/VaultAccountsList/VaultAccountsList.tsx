import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
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
      {chains.map((chain) => {
        if (!accountsMap[chain.chainId]) return;

        return (
          <div key={chain.chainId}>
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
                    const accountId = isSharded ? account.at(0)?.accountId : account.accountId;

                    if (!accountId) return null;

                    return (
                      <li className="mb-2 last:mb-0" key={accountUtils.getDerivationPath(account)}>
                        <DerivedAccount
                          account={account}
                          addressPrefix={chain.addressPrefix}
                          onClick={isSharded ? () => onShardClick?.(account) : undefined}
                        >
                          {!isSharded && (
                            <AccountExplorers accountId={accountId} chain={chain}>
                              <Box gap={0.5}>
                                <FootnoteText className="text-text-tertiary">
                                  {t('general.explorers.derivationTitle')}
                                </FootnoteText>
                                <HelpText className="break-all text-text-secondary">
                                  {accountUtils.getDerivationPath(account)}
                                </HelpText>
                              </Box>
                            </AccountExplorers>
                          )}
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
