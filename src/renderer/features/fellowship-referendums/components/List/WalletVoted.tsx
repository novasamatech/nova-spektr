import { useStoreMap } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText, Icon } from '@/shared/ui';
import { type Referendum } from '@/domains/collectives';
import { votingModel } from '../../model/voting';

type Props = {
  referendum: Referendum;
};

export const WalletVoted = ({ referendum }: Props) => {
  const { t } = useI18n();

  const voting = useStoreMap({
    store: votingModel.$accountsVoting,
    keys: [referendum.id],
    fn: (votings, [id]) => votings.find(voting => voting.referendumId === id),
  });

  if (!voting) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-1">
      <Icon name="voted" size={16} className="text-icon-accent" />
      <FootnoteText className="text-icon-accent">{t('governance.voted')}</FootnoteText>
    </div>
  );
};
