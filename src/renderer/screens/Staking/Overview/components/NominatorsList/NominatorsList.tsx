import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';

import { Address, SigningType, EraIndex } from '@renderer/domain/shared-kernel';
import { Unlocking } from '@renderer/domain/stake';
import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText, Plate, BodyText, Checkbox, InfoPopover, Popover } from '@renderer/components/ui-redesign';
import { AccountAddress, ExplorerLink } from '@renderer/components/common';
import { Icon, Shimmering, Balance } from '@renderer/components/ui';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import TimeToEra from '../TimeToEra/TimeToEra';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import { redeemableAmount } from '@renderer/shared/utils/balance';

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
  signingType: SigningType;
  accountName: string;
  isSelected: boolean;
  totalReward?: string;
  totalStake?: string;
  unlocking?: Unlocking[];
};

type Props = {
  api?: ApiPromise;
  era?: number;
  nominators: NominatorInfo[];
  asset?: Asset;
  explorers?: Explorer[];
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address) => void;
};

const NominatorsList = ({ api, era, nominators, asset, explorers, onCheckValidators, onToggleNominator }: Props) => {
  const { t } = useI18n();

  const getExplorers = (address: Address, stash?: Address, explorers: Explorer[] = []) => {
    const explorersContent = explorers.map((explorer) => ({
      id: explorer.name,
      value: <ExplorerLink explorer={explorer} address={address} />,
    }));

    if (!stash) return [{ items: explorersContent }];

    const validatorsButton = (
      <button
        type="button"
        className="flex items-center gap-x-2 px-2 w-full h-full"
        onClick={() => onCheckValidators(stash)}
      >
        <Icon name="viewValidators" size={16} />
        <FootnoteText as="span">{t('staking.overview.viewValidatorsOption')}</FootnoteText>
      </button>
    );

    return [{ items: [{ id: '0', value: validatorsButton }] }, { items: explorersContent }];
  };

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[226px,104px,144px] items-center gap-x-6 px-3">
        <FootnoteText className="text-text-secondary">{t('staking.overview.accountTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('staking.overview.stakeTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-secondary">{t('staking.overview.rewardsTableHeader')}</FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">
        {nominators.map((stake) => {
          const unstakeBadge = getNextUnstakingEra(stake.unlocking, era) && (
            <Popover
              offsetPx={-65}
              contentClass="py-1 px-2 bg-switch-background-active rounded w-max"
              position="left-1/2 -translate-x-1/2"
              content={
                <HelpText className="text-white">
                  <Trans t={t} i18nKey="staking.badges.unstakeDescription" />
                </HelpText>
              }
            >
              <div className="flex gap-x-1 items-center rounded-md bg-badge-background text-icon-accent text-2xs px-2 py-0.5">
                <Icon name="unstake" className="text-icon-accent" size={14} />
                <TimeToEra api={api} era={getNextUnstakingEra(stake.unlocking, era)} />
              </div>
            </Popover>
          );

          const redeemBadge = hasRedeem(stake.unlocking, era) && (
            <Popover
              offsetPx={-48}
              contentClass="py-1 px-2 bg-switch-background-active rounded w-max"
              position="left-1/2 -translate-x-1/2"
              content={
                <HelpText className="text-white">
                  <Trans t={t} i18nKey="staking.badges.redeemDescription" />
                </HelpText>
              }
            >
              <div className="flex gap-x-1 items-center rounded-md bg-positive-background text-text-positive text-2xs px-2 py-0.5">
                <Icon name="redeem" className="text-text-positive" size={14} />
                {t('staking.badges.redeemTitle')}
              </div>
            </Popover>
          );

          return (
            <li key={stake.address}>
              <Plate className="grid grid-cols-[226px,104px,104px,16px] items-center gap-x-6">
                <Checkbox checked={stake.isSelected} onChange={() => onToggleNominator(stake.address)}>
                  <AccountAddress name={stake.accountName} address={stake.address} />
                  {unstakeBadge || redeemBadge}
                </Checkbox>
                {stake.totalStake === undefined || !asset ? (
                  <Shimmering width={104} height={14} />
                ) : (
                  <BodyText>
                    <Balance
                      className="text-xs font-semibold"
                      value={stake.totalStake}
                      precision={asset.precision}
                      symbol={asset.symbol}
                    />
                  </BodyText>
                )}
                {stake.totalReward === undefined || !asset ? (
                  <Shimmering width={104} height={14} />
                ) : (
                  <BodyText>
                    <Balance
                      className="text-xs font-semibold"
                      value={stake.totalReward}
                      precision={asset.precision}
                      symbol={asset.symbol}
                    />
                  </BodyText>
                )}
                <InfoPopover data={getExplorers(stake.address, stake.stash, explorers)} position="top-full right-0">
                  <Icon name="info" size={14} className="text-icon-default" />
                </InfoPopover>
              </Plate>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NominatorsList;
