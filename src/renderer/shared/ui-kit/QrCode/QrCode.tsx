import { useEffect, useMemo, useRef, useState } from 'react';

import { createQrImage } from './helpers';

type Props = {
  payload: Uint8Array | Uint8Array[];
  size: string;
  delay?: number;
  maxDelay?: number;
  bgColor?: string;
  qrColor?: string;
  className?: string;
  testId?: string;
};

export const QrCode = ({ payload, delay = 0, maxDelay, size, bgColor, qrColor, className, testId }: Props) => {
  const MAX_DELAY = maxDelay ?? delay;

  const delayRef = useRef(delay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);

  const isMultiFrame = Array.isArray(payload);
  const frames = useMemo(() => (isMultiFrame ? payload : [payload]), [payload]);
  const images = useMemo(() => frames.map(frame => createQrImage(frame, bgColor, qrColor)), [frames, bgColor, qrColor]);

  useEffect(() => {
    if (!isMultiFrame) {
      return;
    }

    const tick = () => {
      setFrameIdx(prevIdx => {
        const nextIdx = (prevIdx + 1) % frames.length;

        if (nextIdx === 0) {
          delayRef.current = Math.min(delayRef.current + 1, MAX_DELAY);
        }

        return nextIdx;
      });
      timerRef.current = setTimeout(tick, delayRef.current);
    };

    timerRef.current = setTimeout(tick, delayRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [frames, isMultiFrame, delayRef]);

  const image = images[frameIdx] ?? '';

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: image }}
      data-testid={testId}
    />
  );
};
