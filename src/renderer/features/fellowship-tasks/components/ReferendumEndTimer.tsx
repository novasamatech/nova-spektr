import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { cnTw, getTimeToBlock } from '@/shared/lib/utils';
import { Duration, FootnoteText, Icon } from '@/shared/ui';
import { fellowshipTasksFeature } from '../model/feature';

type ReferendumType = 'personal' | 'general';

const ONE_DAY = 24 * 60 * 60;

function getTimerColor(time: number, referendumType: ReferendumType) {
  const days = Math.floor(time / ONE_DAY);

  if (referendumType === 'personal') {
    if (days <= 3) return 'text-icon-negative';
    if (days >= 7) return 'text-text-secondary';
    return 'text-text-warning';
  }

  if (days <= 3) return 'text-text-warning';
  return 'text-text-secondary';
}

type Props = {
  endBlock: number | null;
  referendumType: ReferendumType;
  shortDateFormat?: boolean;
};

export const ReferendumEndTimer = ({ endBlock, referendumType, shortDateFormat }: Props) => {
  const input = useUnit(fellowshipTasksFeature.input);
  const [endTime, setEndTime] = useState<number>();

  useEffect(() => {
    if (endBlock && input) {
      getTimeToBlock(endBlock, input.api).then(date => {
        setEndTime(date / 1000);
      });
    }
  }, [endBlock, input]);

  if (!endBlock || !endTime || !input) return null;

  return <ReferendumTimer time={endTime} referendumType={referendumType} shortDateFormat={shortDateFormat} />;
};

type PropsTimer = {
  time: number;
  referendumType: ReferendumType;
  shortDateFormat?: boolean;
};

const ReferendumTimer = ({ time, referendumType, shortDateFormat }: PropsTimer) => {
  const [countdown, setCountdown] = useState(time);

  const countdownUnit =
    countdown < 60
      ? 1 // if less then a minute, countdown each second
      : countdown < 3600
        ? 60 // if less then an hour, countdown each minute
        : 3600; // countdown each hour

  useEffect(() => {
    if (countdown === 0) return;

    const timer = setTimeout(() => setCountdown(countdown - countdownUnit), countdownUnit * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [countdown, countdownUnit]);

  const timerColor = getTimerColor(time, referendumType);

  return (
    <div className={cnTw('mr-1 flex items-center gap-x-1', timerColor)}>
      <Icon name="clock" size={16} className="text-inherit" />
      <Duration as={FootnoteText} className="text-text-secondary" seconds={countdown} shortFormat={shortDateFormat} />
    </div>
  );
};
