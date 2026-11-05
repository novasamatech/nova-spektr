import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
import { type DataCompleteness } from '@/domains/staking';
import { AssetFiatBalance } from '@/widgets/price';

type Props = {
  /** Reward total in planck, `undefined` while it is loading. */
  amount?: string;
  asset?: Asset;
  /** How far `amount` can be trusted, `undefined` while it is loading. */
  completeness?: DataCompleteness;
};

/**
 * The rewards of one row.
 *
 * A zero is only printed for a complete answer. Rewards that could not be
 * loaded, or an answer missing a source that found nothing, say so instead: `0
 * DOT` there would state that the account earned nothing. What an answer
 * missing a source did find is real and is shown.
 */
export const RewardAmount = ({ amount, asset, completeness }: Props) => {
  const { t } = useI18n();

  if (!asset || !completeness) {
    return (
      <div className="flex flex-col items-end gap-y-1.5 pb-1">
        <Skeleton width={20} height={4} />
        <Skeleton width={14} height={3} />
      </div>
    );
  }

  const known = amount !== undefined && (completeness === 'complete' || Number(amount) > 0);

  if (completeness === 'unavailable' || !known) {
    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className="flex justify-end">
            <FootnoteText className="text-text-tertiary">{t('staking.overview.rewardsUnavailable')}</FootnoteText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          {/* Nothing loaded, or part of it loaded and that part found nothing. */}
          {completeness === 'unavailable'
            ? t('staking.overview.rewardsUnavailableHint')
            : t('staking.overview.rewardsIncompleteHint')}
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col items-end justify-self-end">
      <AssetBalance value={amount} asset={asset} />
      <AssetFiatBalance amount={amount} asset={asset} />
    </div>
  );
};
