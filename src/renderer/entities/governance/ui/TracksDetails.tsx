import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { CaptionText, Icon, Tooltip } from '@/shared/ui';
import { allTracks } from '../constants/tracks';

type Props = {
  tracks: number[];
};

export const TracksDetails = ({ tracks }: Props) => {
  const { t } = useI18n();

  return (
    <div className="group flex items-center gap-x-1 rounded px-2 py-1 hover:bg-action-background-hover">
      <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
        <CaptionText className="text-white">{tracks.length}</CaptionText>
      </div>

      <Tooltip
        content={tracks
          .map((trackId) => t(allTracks.find((track) => Number(track.id) === trackId)?.value || ''))
          .filter(nonNullable)
          .join(', ')}
        pointer="up"
      >
        <Icon className="group-hover:text-icon-hover" name="info" size={16} />
      </Tooltip>
    </div>
  );
};
