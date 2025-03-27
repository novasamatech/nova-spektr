import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { cnTw, getTimeToBlock } from '@/shared/lib/utils';
import { Duration, FootnoteText, Icon } from '@/shared/ui';
import { fellowshipTasksFeature } from '../model/feature';

const ONE_DAY = 24 * 60 * 60;

function getTimerColor(time: number) {
  const days = Math.floor(time / ONE_DAY);

  if (days <= 15) return 'text-icon-negative';
  if (days <= 30) return 'text-text-warning';
  return 'text-text-secondary';
}

type Props = {
  endBlock: number | null;
  shortDateFormat?: boolean;
};

export const RetentionEndTimer = ({ endBlock, shortDateFormat }: Props) => {
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

  return <Timer time={endTime} shortDateFormat={shortDateFormat} />;
};

type PropsTimer = {
  time: number;
  shortDateFormat?: boolean;
};

const Timer = ({ time, shortDateFormat }: PropsTimer) => {
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

  const timerColor = getTimerColor(countdown);

  return (
    <div className={cnTw('mr-1 flex items-center gap-x-1', timerColor)}>
      <Icon name="clock" size={16} className="text-inherit" />
      <Duration as={FootnoteText} className="text-text-secondary" seconds={countdown} shortFormat={shortDateFormat} />
    </div>
  );
};
