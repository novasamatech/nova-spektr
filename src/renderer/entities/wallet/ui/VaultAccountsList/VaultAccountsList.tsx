import { useUnit } from 'effector-react';
import { entries, groupBy } from 'lodash';
import { Fragment, memo, useMemo } from 'react';

import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, Separator } from '@/shared/ui';
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

const EVM_GROUP_ID = 'evm' as const;

const getConsensusChainId = (chain: Chain): string => {
  return networkUtils.isEthereumBased(chain.options) ? EVM_GROUP_ID : (chain.parentId ?? chain.chainId);
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

      const isEvm = consensusChainId === EVM_GROUP_ID;

      return {
        id: consensusChainId,
        chain: isEvm ? EVM_GROUP_ID : allChains[consensusChainId as ChainId],
        accounts,
      };
    })
    .filter(nonNullable)
    .toSorted((a) => (a.id === EVM_GROUP_ID ? 1 : 0));
};

const EvmChainTitle = () => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-x-2">
      <Icon name="ethereum" size={16} />
      <FootnoteText as="span" className="text-text-secondary uppercase">
        {t('walletDetails.vault.evmGroup')}
      </FootnoteText>
    </div>
  );
};

export const VaultAccountsList = memo(({ chains, accountsMap, className, onShardClick }: Props) => {
  const { t } = useI18n();
  const allChains = useUnit(networkModel.$chains);
  const chainGroups = useMemo(() => buildChainGroups(chains, accountsMap, allChains), [chains, accountsMap, allChains]);

  return (
    <div className={cnTw('flex flex-col overflow-y-auto', className)}>
      {chainGroups.map((group, groupIndex) => (
        <Fragment key={group.id}>
          <Accordion initialOpen>
            <Accordion.Trigger>
              <span className="normal-case">
                {group.chain === EVM_GROUP_ID ? (
                  <EvmChainTitle />
                ) : group.chain ? (
                  <ChainTitle fontClass="text-text-secondary uppercase" chain={group.chain} />
                ) : null}
              </span>
              <FootnoteText className="text-text-tertiary">{group.accounts.length}</FootnoteText>
            </Accordion.Trigger>
            <Accordion.Content>
              <ul className="pl-4">
                {group.accounts.map((account) => {
                  const isSharded = accountUtils.isAccountWithShards(account);
                  const chain = allChains[isSharded ? account[0]!.chainId : account.chainId]!;
                  const derivationPath = accountUtils.getDerivationPath(account);

                  return (
                    // A group spans a whole relay family, but derivation paths are only
                    // unique per chain — the path alone collides across chains.
                    <li className="mb-2 last:mb-0" key={`${chain.chainId}-${derivationPath}`}>
                      <DerivedAccount
                        account={account}
                        chain={chain}
                        onClick={isSharded ? () => onShardClick?.(account) : undefined}
                      >
                        {/* Shards have no accountId, so DerivedAccount renders no explorers popover to host this. */}
                        {!isSharded && (
                          <Box gap={0.5}>
                            <FootnoteText className="text-text-tertiary">
                              {t('general.explorers.derivationTitle')}
                            </FootnoteText>
                            <HelpText className="break-all text-text-secondary">{derivationPath}</HelpText>
                          </Box>
                        )}
                      </DerivedAccount>
                    </li>
                  );
                })}
              </ul>
            </Accordion.Content>
          </Accordion>
          {groupIndex !== chainGroups.length - 1 && <Separator className="my-4 w-full" />}
        </Fragment>
      ))}
    </div>
  );
});
