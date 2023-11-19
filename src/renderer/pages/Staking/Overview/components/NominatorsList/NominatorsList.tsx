import { useEffect, useMemo, useState } from 'react';
import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { useI18n } from '@renderer/app/providers';
import { FootnoteText, Checkbox, Tooltip, Icon, HelpText, Accordion, Shimmering } from '@renderer/shared/ui';
import { TimeToEra } from '../TimeToEra/TimeToEra';
import { redeemableAmount } from '@renderer/shared/lib/utils';
import { AccountAddress, accountUtils, walletModel, walletUtils } from '@renderer/entities/wallet';
import type { Asset, Explorer, Address, EraIndex, Unlocking, Account } from '@renderer/shared/core';
import { NominatorsItem } from './NominatorItem/NominatorItem';
import { ShardAccount } from '@renderer/shared/core/types/account';
import { AssetBalance } from '@renderer/entities/asset';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';

const getNextUnstakingEra = (unlocking: Unlocking[] = [], era?: number): EraIndex | undefined => {
  if (!era) return undefined;

  const unlockingMatch = unlocking.find((u) => Number(u.era) > era);

  return unlockingMatch ? Number(unlockingMatch.era) : undefined;
};

const hasRedeem = (unlocking: Unlocking[] = [], era?: number): boolean => {
  if (!era || unlocking.length === 0) return false;

  return Boolean(redeemableAmount(unlocking, era));
};

export type NominatorInfo = {
  address: Address;
  stash?: Address;
  isSelected: boolean;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
  account: Account;
};

type Props = {
  api?: ApiPromise;
  era?: number;
  nominators: NominatorInfo[];
  asset?: Asset;
  explorers?: Explorer[];
  isStakingLoading: boolean;
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address, value?: boolean) => void;
};

export const NominatorsList = ({
  api,
  era,
  nominators,
  asset,
  explorers,
  isStakingLoading,
  onCheckValidators,
  onToggleNominator,
}: Props) => {
  console.log(api, era, asset, isStakingLoading, explorers, nominators);

  const { t } = useI18n();
  const [shards, setShards] = useState<NominatorInfo[]>([]);
  const [selectedShards, setSelectedShards] = useState<number>(0);

  const activeWallet = useUnit(walletModel.$activeWallet);

  useEffect(() => {
    if (!activeWallet || !nominators.length) return;
    setShards(nominators.filter((nominator: NominatorInfo) => (nominator.account as ShardAccount).shardedId));
  }, [activeWallet, nominators]);

  const selectAllShards = (stakeAddress: Address, value: boolean) => {
    const allShards = shards.map((shard) => {
      onToggleNominator(shard.address, value);
      setSelectedShards(value ? shards.length : 0);

      return { ...shard, isSelected: value };
    });
    onToggleNominator(stakeAddress);

    console.log(9, shards, value, selectedShards);
    // if (!allShards.length) return;
    setShards(allShards);
  };
  console.log(shards, selectedShards);

  const getUnstakeBadge = (stake: NominatorInfo) =>
    getNextUnstakingEra(stake.unlocking, era) && (
      <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.unstakeDescription" />}>
        <div className="flex gap-x-1 items-center rounded-md bg-badge-background px-2 py-0.5">
          <Icon name="unstake" className="text-icon-accent" size={14} />
          <HelpText className="text-icon-accent">
            <TimeToEra className="my-1" api={api} era={getNextUnstakingEra(stake.unlocking, era)} />
          </HelpText>
        </div>
      </Tooltip>
    );

  const getRedeemBadge = (stake: NominatorInfo) =>
    hasRedeem(stake.unlocking, era) && (
      <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.redeemDescription" />}>
        <div className="flex gap-x-1 items-center rounded-md bg-positive-background text-text-positive px-2 py-0.5">
          <Icon name="redeem" className="text-text-positive" size={14} />
          <HelpText className="text-text-positive">{t('staking.tooltips.redeemTitle')}</HelpText>
        </div>
      </Tooltip>
    );

  const getContent = (stake: NominatorInfo) => (
    <>
      <AccountAddress className="max-w-[115px]" name={stake.account.name} address={stake.address} />
      <div className="ml-auto">{getUnstakeBadge(stake) || getRedeemBadge(stake)}</div>
    </>
  );

  const selectShard = (nominator: string, isChecked: boolean) => {
    console.log(89, nominator, isChecked, selectedShards);

    setSelectedShards((prev) => (isChecked ? prev + 1 : prev - 1));
    onToggleNominator(nominator);
  };
  const getShards = (nominators: NominatorInfo[]) => {
    //array of shards into sharded acc
    // shard select -> root sharded diselest
    if (!shards.length) return;

    console.log(nominators, 5, shards);

    return shards.map((shard: NominatorInfo) => (
      <li key={shard.account.id}>
        <NominatorsItem
          key={shard.account.id}
          isStakingLoading={isStakingLoading}
          content={getContent(shard)}
          stake={shard}
          nominators={nominators}
          asset={asset}
          explorers={explorers}
          onToggleNominator={selectShard}
          onCheckValidators={onCheckValidators}
        />
      </li>
    ));
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
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[226px,104px,104px,40px] items-center gap-x-6 px-3">
        <FootnoteText className="text-text-tertiary">{t('staking.overview.accountTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-tertiary" align="right">
          {t('staking.overview.stakeTableHeader')}
        </FootnoteText>
        <FootnoteText className="text-text-tertiary" align="right">
          {t('staking.overview.rewardsTableHeader')}
        </FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">
        {nominators.map((stake) => {
          if (accountUtils.isShardAccount(stake.account)) return;

          return (
            <>
              <li key={stake.account.id}>
                {walletUtils.isPolkadotVault(activeWallet) ? (
                  <Accordion isDefaultOpen className="w-auto">
                    <div className="hover:bg-action-background-hover flex">
                      <Accordion.Button buttonClass="ml-auto w-auto" />
                      <Checkbox
                        checked={selectedShards === shards.length}
                        className="p-2 w-full"
                        semiChecked={selectedShards > 0 && selectedShards < shards.length}
                        onChange={(event) => selectAllShards(stake.address, event.target?.checked)}
                      >
                        <div className="grid grid-cols-[226px,104px,104px] items-center gap-x-6">
                          {/* sharded acc onChange - make all shards isSelected  */}
                          <div className="flex items-center gap-x-2">
                            <FootnoteText className="text-text-secondary">{shards.length}</FootnoteText>
                            <FootnoteText className="text-text-secondary">staking</FootnoteText>
                          </div>
                          <div className="justify-self-end flex flex-col items-end">
                            {!stake.totalStake || !asset ? (
                              <>
                                <Shimmering width={82} height={20} />
                                <Shimmering width={56} height={18} />
                              </>
                            ) : (
                              <>
                                <AssetBalance value={totalStake} asset={asset} />
                                <AssetFiatBalance amount={totalStake} asset={asset} />
                              </>
                            )}
                          </div>
                          <div className="justify-self-end flex flex-col items-end">
                            {!asset ? (
                              <>
                                <Shimmering width={82} height={20} />
                                <Shimmering width={56} height={18} />
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
                      {/* shards accounts */}
                      <ul>{getShards(nominators)}</ul>
                    </Accordion.Content>
                  </Accordion>
                ) : (
                  <NominatorsItem
                    isStakingLoading={isStakingLoading}
                    content={getContent(stake)}
                    stake={stake}
                    nominators={nominators}
                    asset={asset}
                    explorers={explorers}
                    onToggleNominator={onToggleNominator}
                    onCheckValidators={onCheckValidators}
                  />
                )}
              </li>
            </>
          );
        })}
      </ul>
    </div>
  );
};
