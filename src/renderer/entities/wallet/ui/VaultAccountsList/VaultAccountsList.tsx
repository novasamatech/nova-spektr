import { useUnit } from 'effector-react';
import { t } from 'i18next';
import { entries, groupBy } from 'lodash';
import { memo, useMemo } from 'react';

import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Separator } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '../../lib/account-utils';
import { DerivedAccount } from '../Cards/DerivedAccount';

type Props = {
  chains: Chain[];
  accountsMap: Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>;
  className?: string;
  onShardClick?: (shards: VaultShardAccount[]) => void;
};

const EVM_CHAIN_CONFIG = {
  chainId: 'evm',
  icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Ethereum.svg',
  name: t('walletDetails.vault.evmGroup'),
};

const getConsensusChainId = (chain: Chain): string => {
  return networkUtils.isEthereumBased(chain.options) ? EVM_CHAIN_CONFIG.chainId : (chain.parentId ?? chain.chainId);
};

const buildChainGroups = (
  chains: Chain[],
  accountsMap: Record<ChainId, (VaultChainAccount | VaultShardAccount[])[]>,
  allChains: Record<ChainId, Chain>,
) => {
  const groupedByConsensus = groupBy(chains, getConsensusChainId);

  return entries(groupedByConsensus)
    .map(([consensusChainId, consensusChains]) => {
      const accounts = consensusChains
        .map((chain) => accountsMap[chain.chainId])
        .flat()
        .filter(nonNullable);

      if (accounts.length === 0) return null;

      const isEvm = consensusChainId === EVM_CHAIN_CONFIG.chainId;
      const evmChain = EVM_CHAIN_CONFIG as unknown as Chain;

      return {
        id: consensusChainId,
        chain: isEvm ? evmChain : allChains[consensusChainId as ChainId],
        accounts,
      };
    })
    .filter(nonNullable)
    .toSorted((a) => (a.id === EVM_CHAIN_CONFIG.chainId ? 1 : 0));
};

export const VaultAccountsList = memo(({ chains, accountsMap, className, onShardClick }: Props) => {
  const { t } = useI18n();
  const allChains = useUnit(networkModel.$chains);
  const chainGroups = useMemo(() => buildChainGroups(chains, accountsMap, allChains), [chains, accountsMap, allChains]);

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      {chainGroups.map((group, groupIndex) => (
        <>
          <Accordion initialOpen key={group.id}>
            <Accordion.Trigger>
              <span className="normal-case">
                <ChainTitle fontClass="text-text-secondary uppercase" chain={group.chain} />
              </span>
              <FootnoteText className="text-text-tertiary">{group.accounts.length}</FootnoteText>
            </Accordion.Trigger>
            <Accordion.Content>
              <ul>
                {group.accounts.map((account) => {
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
          {groupIndex !== chainGroups.length - 1 && <Separator className="my-4 w-full" />}
        </>
      ))}
    </div>
  );
});
