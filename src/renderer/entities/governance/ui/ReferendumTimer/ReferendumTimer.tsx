import { useEffect, useState } from 'react';

import { useI18n } from '@/app/providers';
import { cnTw } from '@/shared/lib/utils';
import { Duration, FootnoteText, Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';

type Status = 'approve' | 'reject' | 'execute';

const TimerIcon: Record<Status, IconNames> = {
  approve: 'clock',
  reject: 'clock',
  execute: 'fire',
};

const TimerColor: Record<Status, string> = {
  approve: 'text-text-secondary',
  reject: 'text-text-secondary',
  execute: 'text-text-warning',
};

const TimerText: Record<Status, string> = {
  approve: 'Approve in',
  reject: 'Reject in',
  execute: 'Execute in',
};

type Props = {
  status: Status;
  time: number;
};

export const ReferendumTimer = ({ status, time }: Props) => {
  const { t } = useI18n();

  const [countdown, setCountdown] = useState(time);

  useEffect(() => {
    if (countdown === 0) return;

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [countdown]);

  return (
    <div className={cnTw('flex gap-x-1 items-center', TimerColor[status])}>
      <Icon name={TimerIcon[status]} size={16} className="text-inherit" />
      <FootnoteText className="text-inherit">{t(TimerText[status])}</FootnoteText>
      <Duration as={FootnoteText} className="text-inherit" hideDaysHours seconds={countdown} />
    </div>
  );
};
