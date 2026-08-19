import { useStoreMap, useUnit } from 'effector-react';
import { type PropsWithChildren, type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Label, ScrollArea, Tooltip } from '@/shared/ui-kit';
import { identity } from '@/domains/network';
import { type ScoreBreakdown } from '@/domains/staking';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import {
  type ScoreTone,
  SCORE_SCALE,
  getDisplayedLabel,
  getScoreTone,
  getValidatorFlag,
  toScoreOutOfTen,
} from '../lib';
import { validatorSelectionModel } from '../model/validator-selection-model';

import { ValidatorFlagBadge } from './ValidatorFlagBadge';

const { events } = validatorSelectionModel;

/** Grey / amber / green, matching the Score column in the table. */
const SCORE_TONE_CLASS: Record<ScoreTone, string> = {
  neutral: 'text-text-tertiary',
  warning: 'text-text-warning',
  positive: 'text-text-positive',
};

export const ValidatorDetailPane = () => {
  const { t } = useI18n();

  const { chain, asset, validator, score, clusterPositions, displayedNames, displayedAddresses } = useUnit({
    chain: validatorSelectionModel.$chain,
    asset: validatorSelectionModel.$asset,
    validator: validatorSelectionModel.$detailValidator,
    score: validatorSelectionModel.$detailScore,
    clusterPositions: validatorSelectionModel.$clusterPositions,
    displayedNames: validatorSelectionModel.$displayedNames,
    displayedAddresses: validatorSelectionModel.$displayedAddresses,
  });

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

  return (
    <aside className="flex w-80 shrink-0 flex-col border-s border-divider">
      <ScrollArea>
        <div className="flex flex-col gap-y-4 p-4">
          <div className="flex items-start justify-between gap-x-2">
            <NamedAccount
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
            <Tooltip>
              <Tooltip.Trigger>
                <div tabIndex={0} className="flex">
                  <Label variant="green">{t('staking.validatorSelection.detail.elected')}</Label>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('staking.validatorSelection.badgeHint.elected')}</Tooltip.Content>
            </Tooltip>
            {flag ? <ValidatorFlagBadge flag={flag} clusterPosition={clusterPosition} /> : null}
          </div>

          <dl className="flex flex-col gap-y-1">
            {/*
              Shown for every elected validator, not only the recommended ones:
              the score is a comparison against the era, and "how does the one I
              picked myself compare" is exactly the question the panel is open
              for. The breakdown behind it lives in the tooltip - it explains the
              number, it is not a second thing to read.
            */}
            {nonNullable(score) ? <ScoreRow score={score} /> : null}

            <HintedRow
              label={t('staking.validatorSelection.detail.estimatedApy')}
              hint={<ApyHint />}
              // The formula does not fold into the width the score bars need.
              hintClassName="w-72 max-w-72"
            >
              {nullable(validator.apy) ? (
                <FootnoteText as="span" className="text-text-tertiary">
                  {t('staking.validatorSelection.detail.notSet')}
                </FootnoteText>
              ) : (
                <FootnoteText
                  as="span"
                  className="font-semibold text-text-positive"
                >{`${validator.apy.toFixed(1)}%`}</FootnoteText>
              )}
            </HintedRow>

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
              {nonNullable(asset) ? (
                <div className="flex flex-col items-end">
                  <AssetBalance value={validator.ownStake} asset={asset} />
                  <AssetFiatBalance asset={asset} amount={validator.ownStake} />
                </div>
              ) : null}
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

type HintedRowProps = PropsWithChildren<{
  label: string;
  hint: ReactNode;
  /** Widens the tooltip past the default when the hint needs the room. */
  hintClassName?: string;
}>;

/**
 * A detail row whose number needs explaining, marked with an info icon.
 *
 * The whole row is the tooltip's target rather than just the icon: the reader
 * is looking at the number when the question occurs to them, and a 16px hit
 * area at the other end of the row is a poor place to send them.
 *
 * Anchored to the left: the pane sits against the right edge of the modal, so a
 * tooltip above the row has nowhere to go but sideways over the table header,
 * and one below it covers the very rows the hint is explaining.
 */
const HintedRow = ({ label, hint, hintClassName, children }: HintedRowProps) => (
  <Tooltip side="left" align="start">
    <Tooltip.Trigger>
      <div tabIndex={0} className="group cursor-help">
        <DetailRow
          label={
            <>
              <FootnoteText as="span" className="text-text-tertiary">
                {label}
              </FootnoteText>
              <Icon name="info" size={16} className="text-text-tertiary group-hover:text-icon-hover" />
            </>
          }
        >
          {children}
        </DetailRow>
      </div>
    </Tooltip.Trigger>
    {/* Wider than the default tooltip: the score bars need a length to be read as one. */}
    <Tooltip.Content className={cnTw('w-60 max-w-60 px-3 py-2.5', hintClassName)}>{hint}</Tooltip.Content>
  </Tooltip>
);

/**
 * What the APY number is and where it comes from.
 *
 * The formula is the two-step computation of `apy/service.ts` reduced to one
 * expression: the pool-wide rate is `eraReward × erasPerYear / totalStaked` and
 * a validator's share of it is `avgStake / itsOwnStake`, so `totalStaked` and
 * `avgStake` cancel and what is left is the validator's cut of one era's reward
 * over its own stake. Written that way it also shows _why_ a smaller validator
 * pays more, which the two intermediate steps hide.
 *
 * Both Asset Hubs run this same expression - only `eras per year` differs, and
 * the era reward is read from each chain, so Polkadot's fixed inflation and
 * Kusama's NPoS curve need no branch of their own.
 */
const ApyHint = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-y-2.5">
      {/* The intro labels the formula, so it stays tied to it rather than floating a full gap away. */}
      <div className="flex flex-col gap-y-1.5">
        <span>{t('staking.validatorSelection.detail.apyFormulaIntro')}</span>

        {/*
          `APY =` is centred against the two lines of the fraction only, so it
          lands level with the fraction bar rather than on the denominator, and
          the tail sits on its own line below - inside the stack it would read as
          a third term of the fraction.
        */}
        <div className="flex flex-col items-center gap-y-1.5 rounded-md bg-white/10 px-2 py-2.5 font-mono">
          <div className="flex items-center gap-x-1.5">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span>APY =</span>
            <div className="flex flex-col items-center">
              <span className="border-b border-white/40 pb-0.5 text-center">
                {t('staking.validatorSelection.detail.apyFormulaNumerator')}
              </span>
              <span className="pt-0.5 text-center">{t('staking.validatorSelection.detail.apyFormulaDenominator')}</span>
            </div>
          </div>
          <span className="text-center">{t('staking.validatorSelection.detail.apyFormulaTail')}</span>
        </div>
      </div>

      <span className="text-white/70">{t('staking.validatorSelection.detail.apyFormulaNote')}</span>
    </div>
  );
};

type ScoreRowProps = {
  score: ScoreBreakdown;
};

/** The composite score, with the metrics behind it one hover away. */
const ScoreRow = ({ score }: ScoreRowProps) => {
  const { t } = useI18n();

  const overall = toScoreOutOfTen(score.overall);

  const hint = (
    <div className="flex flex-col gap-y-2.5">
      <span className="text-white/70">{t('staking.validatorSelection.detail.scoreHint')}</span>

      <div className="flex flex-col gap-y-2">
        <ScoreLine label={t('staking.validatorSelection.detail.scoreApy')} value={score.apy} />
        <ScoreLine label={t('staking.validatorSelection.detail.scoreCommission')} value={score.commission} />
        <ScoreLine label={t('staking.validatorSelection.detail.scoreSelfStake')} value={score.selfStake} />
        <ScoreLine label={t('staking.validatorSelection.detail.scoreEraPoints')} value={score.eraPoints} />
      </div>
    </div>
  );

  return (
    <HintedRow label={t('staking.validatorSelection.detail.score')} hint={hint}>
      <FootnoteText as="span" className={cnTw('font-semibold tabular-nums', SCORE_TONE_CLASS[getScoreTone(overall)])}>
        {t('staking.validatorSelection.scoreOutOfTen', { score: overall })}
      </FootnoteText>
    </HintedRow>
  );
};

type ScoreLineProps = {
  label: string;
  value: number;
};

/**
 * The bar is filled from the rounded score rather than the raw fraction, so it
 * never disagrees with the number printed next to it.
 *
 * Hand-rolled rather than `Progress`: that one is themed for light surfaces -
 * its track is a 6%-alpha ink that vanishes on the dark tooltip, and its blue
 * fill barely separates from it.
 */
const ScoreLine = ({ label, value }: ScoreLineProps) => {
  const { t } = useI18n();

  const score = toScoreOutOfTen(value);

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center justify-between gap-x-3">
        <span className="truncate text-white/70">{label}</span>
        <span className="tabular-nums">{t('staking.validatorSelection.scoreOutOfTen', { score })}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${(score / SCORE_SCALE) * 100}%` }} />
      </div>
    </div>
  );
};
