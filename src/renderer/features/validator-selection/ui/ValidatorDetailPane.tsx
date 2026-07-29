import { useStoreMap, useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { Alert, DetailRow, FootnoteText, IconButton } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Label, Progress, ScrollArea } from '@/shared/ui-kit';
import { identity } from '@/domains/network';
import { type ScoreBreakdown } from '@/domains/staking';
import { AssetFiatBalance } from '@/widgets/price';
import { type ValidatorFlag, getDisplayedLabel, getValidatorFlag } from '../lib';
import { validatorSelectionModel } from '../model/validator-selection-model';

import { ValidatorFlagBadge } from './ValidatorFlagBadge';

const { events } = validatorSelectionModel;

/**
 * `blocked` and `noIdentity` describe what the chain does or does not say about
 * a validator, so they are stated rather than warned about.
 */
const RISK_VARIANT: Record<ValidatorFlag, 'info' | 'warn' | 'error'> = {
  blocked: 'info',
  slashed: 'error',
  cluster: 'warn',
  noIdentity: 'info',
};

export const ValidatorDetailPane = () => {
  const { t } = useI18n();

  const { chain, asset, validator, score, recommended, clusterPositions, displayedNames, displayedAddresses } = useUnit(
    {
      chain: validatorSelectionModel.$chain,
      asset: validatorSelectionModel.$asset,
      validator: validatorSelectionModel.$detailValidator,
      score: validatorSelectionModel.$detailScore,
      recommended: validatorSelectionModel.$recommended,
      clusterPositions: validatorSelectionModel.$clusterPositions,
      displayedNames: validatorSelectionModel.$displayedNames,
      displayedAddresses: validatorSelectionModel.$displayedAddresses,
    },
  );

  const accountIdentity = useStoreMap({
    store: identity.$list,
    keys: [chain?.chainId, validator?.accountId],
    fn: (list, [chainId, accountId]) => {
      if (nullable(chainId) || nullable(accountId)) return null;

      return list[chainId]?.[accountId] ?? null;
    },
  });

  if (nullable(validator)) {
    return (
      <aside className="flex w-80 shrink-0 items-center justify-center border-s border-divider px-6">
        <FootnoteText align="center" className="text-text-tertiary">
          {t('staking.validatorSelection.detail.placeholder')}
        </FootnoteText>
      </aside>
    );
  }

  const clusterPosition = clusterPositions[validator.accountId];
  const flag = getValidatorFlag(validator, clusterPosition);
  const isRecommended = recommended.includes(validator.accountId);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-s border-divider">
      <ScrollArea>
        <div className="flex flex-col gap-y-4 p-4">
          <div className="flex items-start justify-between gap-x-2">
            <Account
              accountId={validator.accountId}
              chain={chain}
              title={getDisplayedLabel(validator.accountId, { names: displayedNames, addresses: displayedAddresses })}
              variant="short"
              iconSize={38}
            />
            <IconButton
              name="close"
              size={16}
              ariaLabel={t('staking.validatorSelection.detail.close')}
              onClick={() => events.detailClosed()}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Label variant="green">{t('staking.validatorSelection.detail.elected')}</Label>
            {flag ? <ValidatorFlagBadge flag={flag} clusterPosition={clusterPosition} /> : null}
          </div>

          <dl className="flex flex-col gap-y-1">
            <DetailRow label={t('staking.validatorSelection.detail.estimatedApy')}>
              {nullable(validator.apy) ? (
                <FootnoteText className="text-text-tertiary">
                  {t('staking.validatorSelection.detail.notSet')}
                </FootnoteText>
              ) : (
                <FootnoteText className="font-semibold text-text-positive">{`${validator.apy.toFixed(1)}%`}</FootnoteText>
              )}
            </DetailRow>

            <DetailRow label={t('staking.validatorSelection.detail.commission')}>
              <FootnoteText>{`${validator.commission.toFixed(1)}%`}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('staking.validatorSelection.detail.eraPoints')}>
              <FootnoteText>{validator.eraPoints.toLocaleString()}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('staking.validatorSelection.detail.nominators')}>
              <FootnoteText>{validator.nominatorCount.toLocaleString()}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('staking.validatorSelection.detail.ownStake')}>
              {nonNullable(asset) ? <AssetBalance value={validator.ownStake} asset={asset} /> : null}
            </DetailRow>

            <DetailRow label={t('staking.validatorSelection.detail.totalStake')}>
              {nonNullable(asset) ? (
                <div className="flex flex-col items-end">
                  <AssetBalance value={validator.totalStake} asset={asset} />
                  <AssetFiatBalance asset={asset} amount={validator.totalStake} />
                </div>
              ) : null}
            </DetailRow>
          </dl>

          <div className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-tertiary uppercase">
              {t('staking.validatorSelection.detail.identityTitle')}
            </FootnoteText>
            <dl className="flex flex-col gap-y-1">
              <IdentityRow
                label={t('staking.validatorSelection.detail.displayName')}
                value={accountIdentity?.name ?? ''}
              />
              <IdentityRow
                label={t('staking.validatorSelection.detail.website')}
                value={accountIdentity?.website ?? ''}
              />
              <IdentityRow label={t('staking.validatorSelection.detail.email')} value={accountIdentity?.email ?? ''} />
            </dl>
          </div>

          {isRecommended && nonNullable(score) ? <WhyRecommended score={score} /> : null}

          {flag ? (
            <Alert active variant={RISK_VARIANT[flag]} title={t('staking.validatorSelection.detail.riskTitle')}>
              <Alert.Item>{t(`staking.validatorSelection.risk.${flag}`)}</Alert.Item>
            </Alert>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
};

type IdentityRowProps = {
  label: string;
  value: string;
};

const IdentityRow = ({ label, value }: IdentityRowProps) => {
  const { t } = useI18n();

  const isSet = value.trim().length > 0;

  return (
    <DetailRow label={label}>
      <FootnoteText align="right" className={isSet ? 'truncate' : 'text-text-tertiary'}>
        {isSet ? value : t('staking.validatorSelection.detail.notSet')}
      </FootnoteText>
    </DetailRow>
  );
};

type WhyRecommendedProps = {
  score: ScoreBreakdown;
};

const WhyRecommended = ({ score }: WhyRecommendedProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-3 rounded-lg bg-main-app-background p-3">
      <FootnoteText className="font-semibold">{t('staking.validatorSelection.detail.whyRecommended')}</FootnoteText>

      {/* The blend that decided the order, above the metrics that fed it. */}
      <ScoreBar label={t('staking.validatorSelection.detail.scoreOverall')} value={score.overall} emphasized />

      <div className="border-t border-container-border" />

      <ScoreBar label={t('staking.validatorSelection.detail.scoreApy')} value={score.apy} />
      <ScoreBar label={t('staking.validatorSelection.detail.scoreCommission')} value={score.commission} />
      <ScoreBar label={t('staking.validatorSelection.detail.scoreSelfStake')} value={score.selfStake} />
      <ScoreBar label={t('staking.validatorSelection.detail.scoreEraPoints')} value={score.eraPoints} />
    </div>
  );
};

type ScoreBarProps = {
  label: string;
  value: number;
  /** The composite row, set apart from the metrics that make it up. */
  emphasized?: boolean;
};

const ScoreBar = ({ label, value, emphasized }: ScoreBarProps) => {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center justify-between">
        <FootnoteText className={emphasized ? 'font-semibold' : 'text-text-tertiary'}>{label}</FootnoteText>
        <FootnoteText className={cnTw('tabular-nums', emphasized && 'font-semibold')}>{`${percent}%`}</FootnoteText>
      </div>
      <Progress value={percent} max={100} />
    </div>
  );
};
