import { type ApiPromise } from '@polkadot/api';
import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { type Account, type Address, type Asset, type BaseAccount, type Chain, type ShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, Tooltip } from '@/shared/ui';
import { Address as AddressComponent } from '@/shared/ui-entities';
import { useStakingData } from '@/entities/staking';
import { type NominatorInfo } from '../lib/types';

import { NominatorsItem } from './NominatorItem';
import { ShardedList } from './ShardedList';
import { TimeToEra } from './TimeToEra';

type Props = {
  nominators: (NominatorInfo<BaseAccount> | NominatorInfo<ShardAccount>[])[];
  isStakingLoading: boolean;
  api?: ApiPromise;
  era?: number;
  asset?: Asset;
  chain: Chain;
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address, value?: boolean) => void;
};

export const NominatorsList = ({
  api,
  era,
  nominators,
  asset,
  chain,
  isStakingLoading,
  onCheckValidators,
  onToggleNominator,
}: Props) => {
  const { t } = useI18n();
  const { getNextUnstakingEra, hasRedeem } = useStakingData();

  const getUnstakeBadge = (stake: NominatorInfo<Account>) => {
    const nextUnstakingEra = getNextUnstakingEra(stake.unlocking, era);
    if (!nextUnstakingEra) return;

    return (
      <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.unstakeDescription" />}>
        <div className="flex items-center gap-x-1 rounded-md bg-badge-background px-2 py-0.5">
          <Icon name="unstake" className="text-icon-accent" size={14} />
          <HelpText className="text-icon-accent">
            <TimeToEra className="my-1" api={api} era={nextUnstakingEra} />
          </HelpText>
        </div>
      </Tooltip>
    );
  };

  const getRedeemBadge = (stake: NominatorInfo<Account>) => {
    if (!hasRedeem(stake.unlocking, era)) return;

    return (
      <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.redeemDescription" />}>
        <div className="flex items-center gap-x-1 rounded-md bg-positive-background px-2 py-0.5 text-text-positive">
          <Icon name="redeem" className="text-text-positive" size={14} />
          <HelpText className="text-text-positive">{t('staking.tooltips.redeemTitle')}</HelpText>
        </div>
      </Tooltip>
    );
  };

  const getContent = (stake: NominatorInfo<Account>): ReactNode => (
    <>
      <AddressComponent title={stake.account.name} variant="truncate" address={stake.address} showIcon iconSize={20} />
      <div className="ml-auto">{getUnstakeBadge(stake) || getRedeemBadge(stake)}</div>
    </>
  );

  const hasShards = nominators.some(Array.isArray);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[1fr,102px,102px,20px] items-center gap-x-6 px-3 pl-4">
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
          if (Array.isArray(stake)) {
            return (
              <li key={stake[0].account.groupId}>
                <ShardedList
                  isStakingLoading={isStakingLoading}
                  shardsStake={stake}
                  era={era}
                  asset={asset}
                  chain={chain}
                  getContent={getContent}
                  onToggleNominator={onToggleNominator}
                  onCheckValidators={onCheckValidators}
                />
              </li>
            );
          }

          return (
            <li key={stake.account.id} className={cnTw(hasShards && '[&>*:first-child]:pl-9')}>
              <NominatorsItem
                isStakingLoading={isStakingLoading}
                content={getContent(stake)}
                stake={stake}
                nominatorsLength={nominators.length}
                asset={asset}
                chain={chain}
                onToggleNominator={onToggleNominator}
                onCheckValidators={onCheckValidators}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
