import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { Button, HeadlineText, Icon, TitleText } from '@/shared/ui';
import { CollectiveRank, TrackDescription } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { evidenceInfo } from '../../model/evidence';

export const requestPromotionActionSlot = createSlot();

type Props = {
  canSkip: boolean;
  onSkip: VoidFunction;
};

export const RequestPromotion = ({ canSkip, onSkip }: Props) => {
  const { t } = useI18n();

  const track = useUnit(evidenceInfo.$track);
  const nextTrack = useUnit(evidenceInfo.$nextTrack);

  return (
    <Box fillContainer padding={5} gap={5}>
      <TitleText>{t('fellowship.tasks.task.promotion.title')}</TitleText>
      <Box direction="row" gap={2.5}>
        {track ? <CollectiveRank rank={track.id}>{track.name}</CollectiveRank> : null}
        <Icon name="right" size={16} className="text-text-primary" />
        {nextTrack ? <CollectiveRank rank={nextTrack.id}>{nextTrack.name}</CollectiveRank> : null}
      </Box>
      <HeadlineText>
        {t('fellowship.tasks.task.promotion.description', { rank: toRomanNumeral(nextTrack?.id ?? 0) })}
      </HeadlineText>
      {nextTrack ? <TrackDescription track={nextTrack} /> : null}
      <Box grow={1} />
      <Box direction="row-reverse" verticalAlign="center" horizontalAlign="space-between">
        <Slot id={requestPromotionActionSlot} />
        {canSkip && (
          <Button variant="text" onClick={onSkip}>
            {t('fellowship.tasks.skip')}
          </Button>
        )}
      </Box>
    </Box>
  );
};
