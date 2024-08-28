import { type BN } from '@polkadot/util';

import { useI18n } from '@app/providers';
import { type Asset } from '@/shared/core';
import { formatAsset, formatBalance } from '@shared/lib/utils';
import { FootnoteText, Icon } from '@shared/ui';

type Props = {
  voited: BN;
  threshold: BN;
  asset: Asset;
};

export const Threshold = ({ voited, threshold, asset }: Props) => {
  const { t } = useI18n();

  if (threshold.isNeg()) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center">
      <FootnoteText className="text-text-secondary">{t('governance.referendum.threshold')}</FootnoteText>
      <FootnoteText className="flex grow justify-end">
        {voited.gt(threshold) ? (
          <span className="flex gap-1">
            <span>{formatAsset(voited, asset)}</span>
            <Icon name="checkmarkOutline" size={18} className="text-icon-positive" />
          </span>
        ) : (
          <span>
            {t('governance.referendum.votedTokens', {
              voted: formatBalance(voited, asset.precision).formatted,
              total: formatBalance(threshold, asset.precision).formatted,
              asset: asset.symbol,
            })}
          </span>
        )}
      </FootnoteText>
    </div>
  );
};
