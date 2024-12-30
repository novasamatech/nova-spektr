import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { type Address, type Asset, type Chain, type Explorer } from '@/shared/core';
import { type VaultShardAccount } from '@/shared/core/types/account';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { CardStack, Checkbox, Skeleton, Tooltip } from '@/shared/ui-kit';
import * as networkDomain from '@/domains/network';
import { AssetBalance } from '@/entities/asset';
import { AssetFiatBalance } from '@/entities/price';
import { useStakingData } from '@/entities/staking';
import { type NominatorInfo } from '../lib/types';

import { NominatorsItem } from './NominatorItem';

type Props = {
  shardsStake: NominatorInfo<VaultShardAccount>[];
  isStakingLoading: boolean;
  era?: number;
  asset?: Asset;
  chain: Chain;
  explorers?: Explorer[];
  addressPrefix?: number;
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address, value?: boolean) => void;
  getContent: (stake: NominatorInfo<VaultShardAccount>) => ReactNode;
};

export const ShardedList = ({
  shardsStake,
  era,
  asset,
  chain,
  isStakingLoading,
  onCheckValidators,
  onToggleNominator,
  getContent,
}: Props) => {
  const { t } = useI18n();
  const { getNextUnstakingEra, hasRedeem } = useStakingData();

  const selectAllShards = (isChecked: boolean) => {
    for (const shard of shardsStake) {
      onToggleNominator(shard.address, isChecked);
    }
  };

  const shardsStats = shardsStake.reduce(
    (acc, shard) => {
      if (getNextUnstakingEra(shard.unlocking, era)) {
        acc.unstaking++;
      }
      if (hasRedeem(shard.unlocking, era)) {
        acc.withdraw++;
      }
      if (shard.isSelected) {
        acc.selected++;
      }

      acc.totalReward += Number(shard.totalReward) || 0;
      acc.totalStake += Number(shard.totalStake) || 0;

      return acc;
    },
    { withdraw: 0, unstaking: 0, totalReward: 0, totalStake: 0, selected: 0 },
  );

  return (
    <CardStack>
      <CardStack.Trigger>
        <div className="flex gap-x-2 py-1.5">
          <Checkbox
            checked={shardsStats.selected === shardsStake.length}
            semiChecked={shardsStats.selected > 0 && shardsStats.selected < shardsStake.length}
            onChange={selectAllShards}
            onClick={(event) => event.stopPropagation()}
          />
          <div className="grid grid-cols-[174px,104px,104px] items-center gap-x-6">
            <div className="flex items-center gap-x-2">
              <FootnoteText className="h-5 rounded-full bg-input-background-disabled px-2 py-px text-text-secondary">
                {shardsStake.length}
              </FootnoteText>
              <FootnoteText className="truncate text-text-secondary first-letter:uppercase">
                {shardsStake[0].account.name}
              </FootnoteText>
              <Tooltip>
                <Tooltip.Trigger>
                  <div className="flex items-center gap-x-1">
                    {Boolean(shardsStats.unstaking) && <span className="h-1.5 w-1.5 rounded-full bg-icon-accent" />}
                    {Boolean(shardsStats.withdraw) && <span className="h-1.5 w-1.5 rounded-full bg-icon-positive" />}
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <Trans
                    t={t}
                    i18nKey="staking.tooltips.redeemAndUnstake"
                    values={{ countUnstake: shardsStats.unstaking, countWithdraw: shardsStats.withdraw }}
                  />
                </Tooltip.Content>
              </Tooltip>
            </div>

            {!shardsStake[0]?.totalStake || !asset ? (
              <div className="flex flex-col items-end gap-y-1.5 pb-1">
                <Skeleton width={20} height={4} />
                <Skeleton width={14} height={3} />
              </div>
            ) : (
              <div className="flex flex-col items-end justify-self-end">
                <AssetBalance value={shardsStats.totalStake.toString()} asset={asset} />
                <AssetFiatBalance amount={shardsStats.totalStake.toString()} asset={asset} />
              </div>
            )}

            {!shardsStake[0]?.totalReward || !asset ? (
              <div className="flex flex-col items-end gap-y-1.5 pb-1">
                <Skeleton width={20} height={4} />
                <Skeleton width={14} height={3} />
              </div>
            ) : (
              <div className="flex flex-col items-end justify-self-end">
                <AssetBalance value={shardsStats.totalReward.toString()} asset={asset} />
                <AssetFiatBalance amount={shardsStats.totalReward.toString()} asset={asset} />
              </div>
            )}
          </div>
        </div>
      </CardStack.Trigger>
      <CardStack.Content>
        <ul className="pl-6">
          {shardsStake.map((shard) => (
            <li key={networkDomain.accountsService.uniqId(shard.account)}>
              <NominatorsItem
                isStakingLoading={isStakingLoading}
                content={getContent(shard)}
                stake={shard}
                nominatorsLength={shardsStake.length}
                asset={asset}
                chain={chain}
                onToggleNominator={onToggleNominator}
                onCheckValidators={onCheckValidators}
              />
            </li>
          ))}
        </ul>
      </CardStack.Content>
    </CardStack>
  );
};
