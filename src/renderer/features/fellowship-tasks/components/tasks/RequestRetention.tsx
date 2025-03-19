import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, Separator, SmallTitleText } from '@/shared/ui';
import { CollectiveRank, TrackDescription } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { tracks } from '../../model/tracks';

export const requestRetentionActionSlot = createSlot();

export const RequestRetention = () => {
  const { t } = useI18n();

  const track = useUnit(tracks.$currentTrack);

  return (
    <Box direction="row" padding={4} gap={5}>
      <Box gap={3} grow={1}>
        <SmallTitleText>{t('fellowship.tasks.task.retention.title')}</SmallTitleText>
        {track ? <CollectiveRank rank={track.id}>{track.name}</CollectiveRank> : null}
        <FootnoteText>
          {t('fellowship.tasks.task.retention.description', { rank: toRomanNumeral(track?.id ?? 0) })}
        </FootnoteText>
        {track ? <TrackDescription track={track} /> : null}
      </Box>
      <Separator vertical />
      <Box verticalAlign="center" shrink={0}>
        <Slot id={requestRetentionActionSlot} />
      </Box>
    </Box>
  );
};
