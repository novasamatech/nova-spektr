import { type ReactNode } from 'react';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { CaptionText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Label, Tooltip } from '@/shared/ui-kit';
import { type PositionValidatorInfo } from '@/domains/staking';
import { AssetFiatBalance } from '@/widgets/price';

type Props = {
  validator: PositionValidatorInfo;
  asset: Asset;
};

const StatCell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-y-0.5">
    <CaptionText className="text-text-tertiary">{label}</CaptionText>
    <div className="flex min-h-6 items-center">{children}</div>
  </div>
);

/**
 * What the drawer shows instead of a nominations table when the position IS the
 * validator: its own terms (commission, blocked) and its active-era standing
 * (self stake, total exposure, nominators, era points). The era fields are
 * `null` until the stash is elected — the cells say so instead of showing zeros
 * that read as facts.
 */
export const ValidatorStatsSection = ({ validator, asset }: Props) => {
  const { t } = useI18n();

  const noValue = (
    <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
  );

  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg bg-block-background p-4">
      <StatCell label={t('dashboard.staking.positions.detail.validator.commission')}>
        <div className="flex items-center gap-x-2">
          <FootnoteText className="text-text-secondary">{`${validator.commission.toFixed(1)}%`}</FootnoteText>
          {validator.blocked ? (
            <Tooltip>
              <Tooltip.Trigger>
                <div className="w-fit">
                  <Label variant="red">{t('dashboard.staking.positions.detail.validator.blocked')}</Label>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('dashboard.staking.positions.detail.validator.blockedHint')}</Tooltip.Content>
            </Tooltip>
          ) : null}
        </div>
      </StatCell>

      <StatCell label={t('dashboard.staking.positions.detail.validator.selfStake')}>
        {validator.ownStake === null ? (
          noValue
        ) : (
          <div className="flex flex-col">
            <AssetBalance value={validator.ownStake} asset={asset} className="text-footnote" />
            <AssetFiatBalance asset={asset} amount={validator.ownStake} />
          </div>
        )}
      </StatCell>

      <StatCell label={t('dashboard.staking.positions.detail.validator.totalExposure')}>
        {validator.totalExposure === null ? (
          noValue
        ) : (
          <div className="flex flex-col">
            <AssetBalance value={validator.totalExposure} asset={asset} className="text-footnote" />
            <AssetFiatBalance asset={asset} amount={validator.totalExposure} />
          </div>
        )}
      </StatCell>

      <StatCell label={t('dashboard.staking.positions.detail.stats.nominators')}>
        {validator.nominatorCount === null ? (
          noValue
        ) : (
          <FootnoteText className="text-text-secondary">
            {t('dashboard.staking.positions.nominatorsValue', { count: validator.nominatorCount })}
          </FootnoteText>
        )}
      </StatCell>

      <StatCell label={t('dashboard.staking.positions.detail.validator.eraPoints')}>
        {validator.eraPoints === null ? (
          noValue
        ) : (
          <FootnoteText className="text-text-secondary">{validator.eraPoints}</FootnoteText>
        )}
      </StatCell>
    </div>
  );
};
