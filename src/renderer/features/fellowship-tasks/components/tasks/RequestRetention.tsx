import { useUnit } from 'effector-react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { toRomanNumeral } from '@/shared/lib/utils';
import { Button, HeadlineText, TitleText } from '@/shared/ui';
import { CollectiveRank, TrackDescription } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { evidenceInfo } from '../../model/evidence';

export const requestRetentionActionSlot = createSlot();

type Props = {
  canSkip: boolean;
  onSkip: VoidFunction;
};

export const RequestRetention = ({ canSkip, onSkip }: Props) => {
  const { t } = useI18n();

  const track = useUnit(evidenceInfo.$track);

  return (
    <Box fillContainer padding={5} gap={5}>
      <TitleText>{t('fellowship.tasks.task.retention.title')}</TitleText>
      {track ? <CollectiveRank rank={track.id}>{track.name}</CollectiveRank> : null}
      <HeadlineText>
        {t('fellowship.tasks.task.retention.description', { rank: toRomanNumeral(track?.id ?? 0) })}
      </HeadlineText>
      {track ? <TrackDescription track={track} /> : null}
      <Box grow={1} />
      <Box direction="row-reverse" verticalAlign="center" horizontalAlign="space-between">
        <Slot id={requestRetentionActionSlot} />
        {canSkip && (
          <Button variant="text" onClick={onSkip}>
            {t('fellowship.tasks.skip')}
          </Button>
        )}
      </Box>
    </Box>
  );
};
