import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toNumberWithPrecision } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton } from '@/shared/ui';

type Props = {
  votes: BN;
  asset: Asset;
  onInfoClick: VoidFunction;
};

export const VotingBalance = ({ votes, asset, onInfoClick }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Icon name="voted" size={16} className="text-icon-accent" />
        <FootnoteText className="text-icon-accent">{t('governance.votedWithAmount')}</FootnoteText>
        <FootnoteText className="text-text-primary">
          {t('governance.referendum.votes', {
            votes: formatBalance(votes, asset.precision).formatted,
            count: toNumberWithPrecision(votes, asset.precision),
          })}
        </FootnoteText>
      </div>
      <IconButton name="info" onClick={onInfoClick} />
    </div>
  );
};
