import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiPromise } from '@polkadot/api';
import { Transition } from '@headlessui/react';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import type { Asset, Explorer, Address, NominatorInfo } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { FootnoteText, Checkbox, Accordion, Shimmering, Plate, Tooltip } from '@shared/ui';
import { ShardAccount } from '@shared/core/types/account';
import { DotStyles } from '@shared/ui/StatusLabel/common/constants';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { useStakingData } from '@entities/staking';
import { NominatorsItem } from '../NominatorItem/NominatorItem';

type NominatorInfoWithShard = NominatorInfo<ShardAccount>;

type Props = {
  shardsStake: NominatorInfoWithShard[];
  api?: ApiPromise;
  era?: number;
  asset?: Asset;
  explorers?: Explorer[];
  isStakingLoading: boolean;
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address, value?: boolean) => void;
  getContent: (stake: NominatorInfoWithShard) => ReactNode;
};

export const ShardedList = ({
  shardsStake,
  api,
  era,
  asset,
  explorers,
  isStakingLoading,
  onCheckValidators,
  onToggleNominator,
  getContent,
}: Props) => {
  const { getNextUnstakingEra, hasRedeem } = useStakingData();

  const { t } = useI18n();
  const [shards, setShards] = useState<NominatorInfoWithShard[]>(shardsStake);
  const [selectedShards, setSelectedShards] = useState<number>(0);
  const [withdrawnShards, setWithdrawnShards] = useState<number>(0);
  const [unstakingShards, setUnstakingShards] = useState<number>(0);

  useEffect(() => {
    setShards(shardsStake);
  }, [shardsStake]);

  const selectAllShards = (value: boolean) => {
    const allShards = shards.map((shard) => {
      onToggleNominator(shard.address, value);
      setSelectedShards(value ? shards.length : 0);

      return { ...shard, isSelected: value };
    });

    setShards(allShards);
  };

  const selectShard = (nominator: string, isChecked: boolean) => {
    setSelectedShards((prev) => (isChecked ? prev + 1 : prev - 1));
    onToggleNominator(nominator);
  };

  const getShards = (shardsStake: NominatorInfoWithShard[]) => {
    if (!shards.length) return;

    return shards.map((shard: NominatorInfoWithShard) => {
      if (hasRedeem(shard.unlocking, era)) {
        setWithdrawnShards((prev) => prev + 1);
      }
      if (getNextUnstakingEra(shard.unlocking, era)) {
        setUnstakingShards((prev) => prev + 1);
      }

      return (
        <li key={shard.account.id}>
          <NominatorsItem
            key={shard.account.id}
            isStakingLoading={isStakingLoading}
            content={getContent(shard)}
            stake={shard}
            nominatorsLength={shardsStake.length}
            asset={asset}
            explorers={explorers}
            onToggleNominator={selectShard}
            onCheckValidators={onCheckValidators}
          />
        </li>
      );
    });
  };

  const { totalReward, totalStake } = useMemo(() => {
    const total = shards.reduce(
      (acc, shard) => {
        return {
          totalReward: acc.totalReward + +(shard.totalReward || 0),
          totalStake: acc.totalStake + +(shard.totalStake || 0),
        };
      },
      { totalReward: 0, totalStake: 0 },
    );

    return { totalReward: total.totalReward.toString(), totalStake: total.totalStake.toString() };
  }, [shards.length, shards]);

  return (
    <li key={shardsStake[0].account.groupId}>
      <Plate className="p-0 shadow-shards border-b-4 border-double">
        <Accordion className="w-auto">
          <div className="hover:bg-action-background-hover flex px-3 py-2 border-b border-divider">
            <Accordion.Button buttonClass="ml-auto w-auto" />
            <Checkbox
              checked={selectedShards === shards.length}
              className="p-2 w-full"
              semiChecked={selectedShards > 0 && selectedShards < shards.length}
              onChange={(event) => selectAllShards(event.target?.checked)}
            >
              <div className="grid grid-cols-[174px,104px,104px] items-center gap-x-6">
                <div className="flex items-center gap-x-2">
                  <FootnoteText className="text-text-secondary h-[20px] rounded-full py-px px-2 bg-input-background-disabled">
                    {shards.length}
                  </FootnoteText>
                  <FootnoteText className="text-text-secondary first-letter:uppercase truncate">
                    {/* names in shard accounts will be the same within one group */}
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    {t('staking.overview.stakingShards', { type: shardsStake[0].account.name })}
                  </FootnoteText>
                  <Tooltip
                    content={
                      <Trans
                        t={t}
                        i18nKey="staking.tooltips.redeemAndUnstake"
                        values={{ countUnstake: unstakingShards, countWithdraw: withdrawnShards }}
                      />
                    }
                    offsetPx={-60}
                    pointer="down"
                  >
                    <div className="flex items-center gap-x-1">
                      {Boolean(unstakingShards) && (
                        <span className={cnTw('min-w-[9px] h-[9px] rounded-full', DotStyles.staking)} />
                      )}
                      {Boolean(withdrawnShards) && (
                        <span className={cnTw('min-w-[9px] min-h-[9px] rounded-full', DotStyles.success)} />
                      )}
                    </div>
                  </Tooltip>
                </div>
                <div className="justify-self-end flex flex-col items-end">
                  {!totalStake || !asset ? (
                    <>
                      <Shimmering width={82} height={15} />
                      <Shimmering width={56} height={10} />
                    </>
                  ) : (
                    <>
                      <AssetBalance value={totalStake} asset={asset} />
                      <AssetFiatBalance amount={totalStake} asset={asset} />
                    </>
                  )}
                </div>
                <div className="justify-self-end flex flex-col items-end">
                  {!totalReward || !asset ? (
                    <>
                      <Shimmering width={82} height={15} />
                      <Shimmering width={56} height={10} />
                    </>
                  ) : (
                    <>
                      <AssetBalance value={totalReward} asset={asset} />
                      <AssetFiatBalance amount={totalReward} asset={asset} />
                    </>
                  )}
                </div>
              </div>
            </Checkbox>
          </div>

          <Accordion.Content>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              {/* shards accounts */}
              <ul className="pl-6">{getShards(shardsStake)}</ul>
            </Transition>
          </Accordion.Content>
        </Accordion>
      </Plate>
    </li>
  );
};
