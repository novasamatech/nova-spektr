import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type CompletedReferendum } from '@/domains/collectives';

type Props = {
  referendum: CompletedReferendum;
};

export const CompletedReferendumVoting = ({ referendum }: Props) => {
  const { t } = useI18n();

  return (
    <Box fillContainer padding={5} gap={5}>
      <SmallTitleText>{t('governance.referendums.referendumTitle', { index: referendum.id })}</SmallTitleText>
    </Box>
  );
};
