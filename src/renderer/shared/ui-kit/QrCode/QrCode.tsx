import { useEffect, useMemo, useRef, useState } from 'react';

import { createQrImage } from './helpers';

type Props = {
  payload: Uint8Array | Uint8Array[];
  size: string;
  delay?: number;
  bgColor?: string;
  qrColor?: string;
  className?: string;
  testId?: string;
};

export const QrCode = ({ payload, delay, size, bgColor, qrColor, className, testId }: Props) => {
  const [frameIdx, setFrameIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMultiFrame = Array.isArray(payload);
  const frames = useMemo(() => (isMultiFrame ? payload : [payload]), [payload]);
  const images = useMemo(() => frames.map(frame => createQrImage(frame, bgColor, qrColor)), [frames, bgColor, qrColor]);

  useEffect(() => {
    if (!isMultiFrame) {
      return;
    }

    const tick = () => {
      setFrameIdx(idx => (idx + 1) % frames.length);
      timerRef.current = setTimeout(tick, delay);
    };

    timerRef.current = setTimeout(tick, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [frames, isMultiFrame, delay]);

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
