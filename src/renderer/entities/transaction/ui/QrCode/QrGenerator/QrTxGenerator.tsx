import init, { Encoder } from 'raptorq/raptorq';
import { useEffect, useState } from 'react';

import { QrCode, Skeleton } from '@/shared/ui-kit';

import { DEFAULT_FRAME_DELAY, DEFAULT_MAX_FRAME_DELAY } from './common/constants';
import { createFrames } from './common/utils';

type Props = {
  payload?: Uint8Array;
  enableRaptorQ?: boolean;
  size?: string;
  bgColor?: string;
  qrColor?: string;
  className?: string;
  testId?: string;
};

export const QrTxGenerator = ({
  payload,
  enableRaptorQ = true,
  size = '240px',
  bgColor,
  qrColor,
  className,
  testId,
}: Props) => {
  const [frames, setFrames] = useState<Uint8Array[] | null>(null);

  useEffect(() => {
    if (!payload) return;

    if (enableRaptorQ) {
      const currentPayload = payload;
      init().then(() => {
        const encoder = Encoder.with_defaults(payload, 128);
        setFrames(createFrames(currentPayload, encoder));
      });
    } else {
      setFrames(createFrames(payload));
    }
  }, [enableRaptorQ, payload]);

  if (!frames) {
    return <Skeleton height={size} width={size} />;
  }

  return (
    <QrCode
      payload={frames}
      size={size}
      bgColor={bgColor}
      qrColor={qrColor}
      className={className}
      delay={DEFAULT_FRAME_DELAY}
      maxDelay={DEFAULT_MAX_FRAME_DELAY}
      testId={testId}
    />
  );
};
