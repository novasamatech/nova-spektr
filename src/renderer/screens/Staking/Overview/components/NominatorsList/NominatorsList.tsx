import { ApiPromise } from '@polkadot/api';
import { Trans } from 'react-i18next';

import { Address, SigningType, EraIndex } from '@renderer/domain/shared-kernel';
import { Unlocking } from '@renderer/domain/stake';
import { useI18n } from '@renderer/app/providers';
import { FootnoteText, Plate, Checkbox, InfoPopover, Tooltip, Icon, Shimmering, HelpText } from '@renderer/shared/ui';
import { AccountAddress, BalanceNew, ExplorerLink } from '@renderer/components/common';
import { Explorer } from '@renderer/domain/chain';
import { Asset } from '@renderer/domain/asset';
import { TimeToEra } from '../TimeToEra/TimeToEra';
import { redeemableAmount } from '@renderer/shared/lib/utils';

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
  isStakingLoading: boolean;
  onCheckValidators: (stash?: Address) => void;
  onToggleNominator: (nominator: Address) => void;
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
        <FootnoteText as="span" className="text-text-primary">
          {t('staking.overview.viewValidatorsOption')}
        </FootnoteText>
      </button>
    );

    return [{ items: [{ id: '0', value: validatorsButton }] }, { items: explorersContent }];
  };

  return (
    <div className="flex flex-col gap-y-2">
      <div className="grid grid-cols-[226px,104px,144px] items-center gap-x-6 px-3">
        <FootnoteText className="text-text-tertiary">{t('staking.overview.accountTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-tertiary">{t('staking.overview.stakeTableHeader')}</FootnoteText>
        <FootnoteText className="text-text-tertiary">{t('staking.overview.rewardsTableHeader')}</FootnoteText>
      </div>

      <ul className="flex flex-col gap-y-2">
        {nominators.map((stake) => {
          const unstakeBadge = getNextUnstakingEra(stake.unlocking, era) && (
            <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.unstakeDescription" />}>
              <div className="flex gap-x-1 items-center rounded-md bg-badge-background px-2 py-0.5">
                <Icon name="unstake" className="text-icon-accent" size={14} />
                <HelpText className="text-icon-accent">
                  <TimeToEra className="my-1" api={api} era={getNextUnstakingEra(stake.unlocking, era)} />
                </HelpText>
              </div>
            </Tooltip>
          );

          const redeemBadge = hasRedeem(stake.unlocking, era) && (
            <Tooltip offsetPx={-65} content={<Trans t={t} i18nKey="staking.tooltips.redeemDescription" />}>
              <div className="flex gap-x-1 items-center rounded-md bg-positive-background text-text-positive px-2 py-0.5">
                <Icon name="redeem" className="text-text-positive" size={14} />
                <HelpText className="text-text-positive">{t('staking.tooltips.redeemTitle')}</HelpText>
              </div>
            </Tooltip>
          );

          const content = (
            <>
              <AccountAddress className="max-w-[115px]" name={stake.accountName} address={stake.address} />
              <div className="ml-auto">{unstakeBadge || redeemBadge}</div>
            </>
          );

          return (
            <li key={stake.address}>
              <Plate className="grid grid-cols-[226px,104px,104px,16px] items-center gap-x-6">
                {stake.signingType === SigningType.PARITY_SIGNER && nominators.length > 1 ? (
                  <Checkbox
                    disabled={isStakingLoading}
                    checked={stake.isSelected}
                    onChange={() => onToggleNominator(stake.address)}
                  >
                    {content}
                  </Checkbox>
                ) : (
                  <div className="flex items-center gap-x-2">{content}</div>
                )}
                {!stake.totalStake || !asset ? (
                  <Shimmering width={104} height={16} />
                ) : (
                  <BalanceNew value={stake.totalStake} asset={asset} />
                )}
                {!stake.totalReward || !asset ? (
                  <Shimmering width={104} height={16} />
                ) : (
                  <BalanceNew value={stake.totalReward} asset={asset} />
                )}
                <InfoPopover data={getExplorers(stake.address, stake.stash, explorers)} position="top-full right-0">
                  <Icon name="info" size={14} />
                </InfoPopover>
              </Plate>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
