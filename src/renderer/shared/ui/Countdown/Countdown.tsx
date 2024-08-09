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
    <div className={cnTw('z-[1] mb-6 mt-2 flex items-center gap-x-2', className)}>
      <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
      <CaptionText
        align="center"
        className={cnTw(
          'h-5 w-[50px] rounded-[26px] px-2 py-1 text-white',
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
