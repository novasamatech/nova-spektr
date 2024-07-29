import { useI18n } from '@app/providers';
import { addLeadingZero, cnTw } from '@shared/lib/utils';
import { CaptionText, FootnoteText } from '../Typography';

function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = addLeadingZero(seconds % 60);

  return `${minutes}:${remainingSeconds}`;
}

type Props = {
  countdown: number;
  className?: string;
};

export const Countdown = ({ countdown, className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex items-center gap-x-2 mt-2 mb-6 z-[1]', className)}>
      <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
      <CaptionText
        align="center"
        className={cnTw(
          'py-1 px-2 w-[50px] h-5 rounded-[26px] text-white',
          (countdown === 0 && 'bg-label-background-gray') ||
            (countdown >= 60 ? 'bg-label-background-green' : 'bg-label-background-red'),
        )}
      >
        {/* if qr is not loaded yet - show zero */}
        {secondsToMinutes(countdown)}
      </CaptionText>
    </div>
  );
};
