import { type ApiPromise } from '@polkadot/api';
import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain, type VaultBaseAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { type AnyAccount, useAccountName } from '@/domains/network';
import { useStakingData } from '@/entities/staking';
import { type NominatorInfo } from '../lib/types';

import { NominatorsItem } from './NominatorItem';
import { ShardedList } from './ShardedList';
import { TimeToEra } from './TimeToEra';

type Props = {
  nominators: (NominatorInfo<VaultBaseAccount> | NominatorInfo<VaultShardAccount>[])[];
  isStakingLoading: boolean;
  api: ApiPromise | null;
  timelineApi: ApiPromise | null;
  era?: number;
  asset?: Asset;
  chain: Chain;
  onCheckValidators: (stash?: AccountId) => void;
  onToggleNominator: (nominator: AccountId, value?: boolean) => void;
};

export const NominatorsList = ({
  api,
  timelineApi,
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

  const getUnstakeBadge = (stake: NominatorInfo<AnyAccount>) => {
    const nextUnstakingEra = getNextUnstakingEra(stake.unlocking, era);
    if (!nextUnstakingEra) return;

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className="flex items-center gap-x-1 rounded-md bg-badge-background px-2 py-0.5">
            <Icon name="unstake" className="text-icon-accent" size={14} />
            <HelpText className="text-icon-accent">
              <TimeToEra className="my-1" api={api} timelineApi={timelineApi} era={nextUnstakingEra} />
            </HelpText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans t={t} i18nKey="staking.tooltips.unstakeDescription" />{' '}
        </Tooltip.Content>
      </Tooltip>
    );
  };

  const getRedeemBadge = (stake: NominatorInfo<AnyAccount>) => {
    if (!hasRedeem(stake.unlocking, era)) return;

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className="flex items-center gap-x-1 rounded-md bg-positive-background px-2 py-0.5 text-text-positive">
            <Icon name="redeem" className="text-text-positive" size={14} />
            <HelpText className="text-text-positive">{t('staking.tooltips.redeemTitle')}</HelpText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans t={t} i18nKey="staking.tooltips.redeemDescription" />
        </Tooltip.Content>
      </Tooltip>
    );
  };

  const getContent = (stake: NominatorInfo<AnyAccount>): ReactNode => {
    const accountName = useAccountName({ accountId: stake.account.accountId, chain });
    return (
      <>
        <Address
          title={accountName}
          variant="truncate"
          address={toAddress(stake.account.accountId, { prefix: chain.addressPrefix })}
          showIcon
          iconSize={20}
        />
        <div className="ml-auto">{getUnstakeBadge(stake) || getRedeemBadge(stake)}</div>
      </>
    );
  };

  const hasShards = nominators.some(Array.isArray);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[1fr_102px_102px_20px] items-center gap-x-6 px-3 pl-4">
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
