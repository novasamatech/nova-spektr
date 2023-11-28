import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';

import { useI18n } from '@renderer/app/providers';
import { cnTw } from '@shared/lib/utils';
import { FootnoteText, Tooltip, Icon, HelpText } from '@shared/ui';
import type { Asset, Explorer, Address, Account, ShardAccount } from '@shared/core';
import { useStakingData } from '@entities/staking';
import { AccountAddress, AddressWithName, accountUtils } from '@entities/wallet';
import { NominatorsItem } from './NominatorItem/NominatorItem';
import { ShardedList } from './ShardedList/ShardedList';
import { TimeToEra } from '../TimeToEra/TimeToEra';
import { NominatorInfo } from '../../common/types';

type Props = {
  nominators: (NominatorInfo<ShardAccount>[] | NominatorInfo)[];
  isStakingLoading: boolean;
  api?: ApiPromise;
  era?: number;
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
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
  addressPrefix,
  onCheckValidators,
  onToggleNominator,
}: Props) => {
  const { t } = useI18n();
  const { getNextUnstakingEra, hasRedeem } = useStakingData();

  const getUnstakeBadge = (stake: NominatorInfo) => {
    const nextUnstakingEra = getNextUnstakingEra(stake.unlocking, era);
    if (!nextUnstakingEra) return;

    return (
      <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.unstakeDescription" />}>
        <div className="flex gap-x-1 items-center rounded-md bg-badge-background px-2 py-0.5">
          <Icon name="unstake" className="text-icon-accent" size={14} />
          <HelpText className="text-icon-accent">
            <TimeToEra className="my-1" api={api} era={nextUnstakingEra} />
          </HelpText>
        </div>
      </Tooltip>
    );
  };

  const getRedeemBadge = (stake: NominatorInfo) => {
    if (!hasRedeem(stake.unlocking, era)) return;

    return (
      <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.redeemDescription" />}>
        <div className="flex gap-x-1 items-center rounded-md bg-positive-background text-text-positive px-2 py-0.5">
          <Icon name="redeem" className="text-text-positive" size={14} />
          <HelpText className="text-text-positive">{t('staking.tooltips.redeemTitle')}</HelpText>
        </div>
      </Tooltip>
    );
  };

  const getContent = (stake: NominatorInfo) => (
    <>
      {accountUtils.isShardAccount(stake.account) ? (
        <AccountAddress addressFont="text-body" address={stake.address} />
      ) : (
        <AddressWithName
          name={(stake.account as Account).name}
          address={stake.address}
          size={20}
          nameFont="text-text-secondary text-body"
          type="adaptive"
        />
      )}
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
          return Array.isArray(stake) ? (
            <li key={stake[0].account.groupId}>
              <ShardedList
                isStakingLoading={isStakingLoading}
                shardsStake={stake}
                era={era}
                asset={asset}
                explorers={explorers}
                addressPrefix={addressPrefix}
                getContent={getContent}
                onToggleNominator={onToggleNominator}
                onCheckValidators={onCheckValidators}
              />
            </li>
          ) : (
            <li key={(stake.account as Account).id} className={cnTw(hasShards && '[&>*:first-child]:pl-9')}>
              <NominatorsItem
                isStakingLoading={isStakingLoading}
                content={getContent(stake)}
                stake={stake}
                nominatorsLength={nominators.length}
                asset={asset}
                explorers={explorers}
                addressPrefix={addressPrefix}
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
