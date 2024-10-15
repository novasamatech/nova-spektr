import { useEffect, useState } from 'react';

import { type ReferendumStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Duration, FootnoteText, Icon } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';

type Status = 'approve' | 'reject' | 'execute' | 'timeout';

const TimerIcon: Record<Status, IconNames> = {
  approve: 'clock',
  reject: 'clock',
  execute: 'fire',
  timeout: 'clock',
};

const TimerColor: Record<Status, string> = {
  approve: 'text-text-secondary',
  reject: 'text-text-secondary',
  timeout: 'text-text-secondary',
  execute: 'text-text-warning',
};

const TimerText: Record<Status, string> = {
  approve: 'governance.referendums.approveIn',
  reject: 'governance.referendums.rejectIn',
  execute: 'governance.referendums.executeIn',
  timeout: 'governance.referendums.timeoutIn',
};

type Props = {
  status: ReferendumStatus;
  time: number;
};

const StatusMap: Record<ReferendumStatus, Status> = {
  Passing: 'approve',
  Deciding: 'reject',
  NoDeposit: 'timeout',
  Execute: 'execute',
};

export const ReferendumTimer = ({ status, time }: Props) => {
  const { t } = useI18n();
  const referendumStatus = StatusMap[status];

  const [countdown, setCountdown] = useState(time);

  useEffect(() => {
    if (countdown === 0) return;

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [countdown]);

  return (
    <div className={cnTw('flex items-center gap-x-1', TimerColor[referendumStatus])}>
      <Icon name={TimerIcon[referendumStatus]} size={16} className="text-inherit" />
      <FootnoteText className="text-inherit">{t(TimerText[referendumStatus])}</FootnoteText>
      <Duration as={FootnoteText} className="text-inherit" hideDaysHours seconds={countdown} />
    </div>
  );
};
