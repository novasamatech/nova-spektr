import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { HeadlineText, SmallTitleText } from '@/shared/ui';
import { CollectiveRank, TrackDescription } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { tracks } from '../../model/tracks';

export const requestRetentionActionSlot = createSlot();

export const RequestRetention = () => {
  const { t } = useI18n();

  const track = useUnit(tracks.$currentTrack);

  return (
    <Box fillContainer padding={5} gap={5}>
      <SmallTitleText>{t('fellowship.tasks.task.retention.title')}</SmallTitleText>
      {track ? <CollectiveRank rank={track.id}>{track.name}</CollectiveRank> : null}
      <HeadlineText>
        {t('fellowship.tasks.task.retention.description', { rank: toRomanNumeral(track?.id ?? 0) })}
      </HeadlineText>
      {track ? <TrackDescription track={track} /> : null}
      <Box grow={1} />
      <Box direction="row-reverse" verticalAlign="center" horizontalAlign="space-between">
        <Slot id={requestRetentionActionSlot} />
      </Box>
    </Box>
  );
};
