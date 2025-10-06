import { useUnit } from 'effector-react';
import { entries, groupBy } from 'lodash';
import { memo, useMemo } from 'react';

import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Separator } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { accountUtils } from '../../lib/account-utils';
import { DerivedAccount } from '../Cards/DerivedAccount';

type Props = {
  chains: Chain[];
  accountsMap: Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
  className?: string;
  onShardClick?: (shards: VaultShardAccount[]) => void;
};

export const VaultAccountsList = memo(({ chains, accountsMap, className, onShardClick }: Props) => {
  const { t } = useI18n();
  const allChains = useUnit(networkModel.$chains);
  const groups = useMemo(
    () => entries(groupBy(chains, (chain) => chain.parentId ?? chain.chainId)) as [ChainId, Chain[]][],
    [chains],
  );

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      {groups.map(([consensusChainId, consensusChains], groupIndex) => {
        const consensusAccounts = consensusChains
          .map((chain) => accountsMap[chain.chainId])
          .flat()
          .filter(nonNullable);
        if (!consensusAccounts.length) return;
        const consensusChain = allChains[consensusChainId];

        return (
          <>
            <Accordion initialOpen key={consensusChainId}>
              <Accordion.Trigger>
                <span className="normal-case">
                  <ChainTitle fontClass="text-text-secondary uppercase" chain={consensusChain} />
                </span>
                <FootnoteText className="text-text-tertiary">{consensusAccounts.length}</FootnoteText>
              </Accordion.Trigger>
              <Accordion.Content>
                <ul>
                  {consensusAccounts.map((account) => {
                    const isSharded = accountUtils.isAccountWithShards(account);
                    const accountId = isSharded ? account[0].accountId : account.accountId;
                    const chain = allChains[isSharded ? account[0].chainId : account.chainId];
                    const derivationPath = accountUtils.getDerivationPath(account);

                    return (
                      <li className="mb-2 last:mb-0" key={derivationPath}>
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
                                <HelpText className="break-all text-text-secondary">{derivationPath}</HelpText>
                              </Box>
                            </AccountExplorers>
                          )}
                        </DerivedAccount>
                      </li>
                    );
                  })}
                </ul>
              </Accordion.Content>
            </Accordion>
            {groupIndex !== groups.length - 1 && <Separator className="my-1 w-full" />}
          </>
        );
      })}
    </div>
  );
});
