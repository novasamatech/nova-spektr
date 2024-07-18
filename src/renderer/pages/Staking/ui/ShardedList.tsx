import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { type Address, type Asset, type Explorer } from '@shared/core';
import { type ShardAccount } from '@shared/core/types/account';
import { Accordion, Checkbox, FootnoteText, Plate, Shimmering, Tooltip } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { useStakingData } from '@entities/staking';
import { type NominatorInfo } from '../lib/types';

import { NominatorsItem } from './NominatorItem';

type Props = {
  shardsStake: NominatorInfo<ShardAccount>[];
  isStakingLoading: boolean;
  era?: number;
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address, value?: boolean) => void;
  getContent: (stake: NominatorInfo<ShardAccount>) => ReactNode;
};

export const ShardedList = ({
  shardsStake,
  era,
  asset,
  explorers,
  isStakingLoading,
  addressPrefix,
  onCheckValidators,
  onToggleNominator,
  getContent,
}: Props) => {
  const { t } = useI18n();
  const { getNextUnstakingEra, hasRedeem } = useStakingData();

  const selectAllShards = (isChecked: boolean) => {
    shardsStake.forEach((shard) => onToggleNominator(shard.address, isChecked));
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
    <Plate className="p-0 shadow-shards border-b-4 border-double">
      <Accordion className="w-auto">
        <div className="flex px-3 py-2 border-b border-divider rounded-md transition-colors hover:bg-action-background-hover">
          <Accordion.Button buttonClass="ml-auto w-auto" iconOpened="shelfDown" iconClosed="shelfRight" />
          <Checkbox
            className="p-2 w-full"
            checked={shardsStats.selected === shardsStake.length}
            semiChecked={shardsStats.selected > 0 && shardsStats.selected < shardsStake.length}
            onChange={(event) => selectAllShards(event.target?.checked)}
          >
            <div className="grid grid-cols-[174px,104px,104px] items-center gap-x-6">
              <div className="flex items-center gap-x-2">
                <FootnoteText className="text-text-secondary h-5 rounded-full py-px px-2 bg-input-background-disabled">
                  {shardsStake.length}
                </FootnoteText>
                <FootnoteText className="text-text-secondary first-letter:uppercase truncate">
                  {shardsStake[0].account.name}
                </FootnoteText>
                <Tooltip
                  offsetPx={-60}
                  content={
                    <Trans
                      t={t}
                      i18nKey="staking.tooltips.redeemAndUnstake"
                      values={{ countUnstake: shardsStats.unstaking, countWithdraw: shardsStats.withdraw }}
                    />
                  }
                >
                  <div className="flex items-center gap-x-1">
                    {Boolean(shardsStats.unstaking) && <span className="w-1.5 h-1.5 rounded-full bg-icon-accent" />}
                    {Boolean(shardsStats.withdraw) && <span className="w-1.5 h-1.5 rounded-full bg-icon-positive" />}
                  </div>
                </Tooltip>
              </div>
              <div className="justify-self-end flex flex-col items-end gap-y-0.5">
                {!shardsStake[0]?.totalStake || !asset ? (
                  <>
                    <Shimmering width={82} height={15} />
                    <Shimmering width={56} height={10} />
                  </>
                ) : (
                  <>
                    <AssetBalance value={shardsStats.totalStake.toString()} asset={asset} />
                    <AssetFiatBalance amount={shardsStats.totalStake.toString()} asset={asset} />
                  </>
                )}
              </div>
              <div className="justify-self-end flex flex-col items-end gap-y-0.5">
                {!shardsStake[0]?.totalReward || !asset ? (
                  <>
                    <Shimmering width={82} height={15} />
                    <Shimmering width={56} height={10} />
                  </>
                ) : (
                  <>
                    <AssetBalance value={shardsStats.totalReward.toString()} asset={asset} />
                    <AssetFiatBalance amount={shardsStats.totalReward.toString()} asset={asset} />
                  </>
                )}
              </div>
            </div>
          </Checkbox>
        </div>

        <Accordion.Content>
          <ul className="pl-6">
            {shardsStake.map((shard) => (
              <li key={shard.account.id}>
                <NominatorsItem
                  isStakingLoading={isStakingLoading}
                  content={getContent(shard)}
                  stake={shard}
                  nominatorsLength={shardsStake.length}
                  asset={asset}
                  explorers={explorers}
                  addressPrefix={addressPrefix}
                  onToggleNominator={onToggleNominator}
                  onCheckValidators={onCheckValidators}
                />
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion>
    </Plate>
  );
};
