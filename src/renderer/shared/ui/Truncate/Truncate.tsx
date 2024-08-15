import { type CSSProperties, memo, useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';

import { getContainerMeasurement, getTextMeasurement } from './utils';

type Props = {
  text: string;
  ellipsis?: string;
  end?: number;
  start?: number;
  className?: string;
};

const containerStyle = {
  display: 'block',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
} satisfies CSSProperties;

export const Truncate = memo<Props>(({ text, ellipsis = '...', end = 5, start = 5, className = '' }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const ellipsisRef = useRef<HTMLParagraphElement>(null);

  const [truncatedText, setTruncatedText] = useState(text);

  const calculateMeasurements = () => {
    return {
      container: getContainerMeasurement(container),
      ellipsis: getTextMeasurement(ellipsisRef.current),
      text: getTextMeasurement(textRef.current),
    };
  };

  const truncateText = (measurements: any) => {
    if (measurements.container.width.value <= measurements.ellipsis.width.value) {
      return ellipsis;
    }

    const delta = Math.ceil(
      measurements.text.width.value - measurements.container.width.value + measurements.ellipsis.width.value,
    );
    const charWidth = measurements.text.width.value / text.length + 0.01;

    const lettersToRemove = Math.ceil(delta / charWidth);
    const center = Math.round(text.length / 2);
    const removeStart = center - Math.ceil(lettersToRemove / 2);
    const removeEnd = removeStart + lettersToRemove;

    const leftSide = text.slice(0, Math.max(start, removeStart));
    const rightSide = text.slice(Math.min(removeEnd, text.length - end));

    return `${leftSide}${ellipsis}${rightSide}`;
  };

  const parseTextForTruncation = useDebouncedCallback(0, (text: string) => {
    const measurements = calculateMeasurements();

    if (!measurements.text.width || measurements.container.width) {
      return;
    }

    const truncatedText =
      Math.round(measurements.text.width.value) > Math.round(measurements.container.width.value)
        ? truncateText(measurements)
        : text;

    setTruncatedText(truncatedText);
  });

  const handleResize = useDebouncedCallback(150, () => {
    parseTextForTruncation(text);
  });

  useEffect(() => {
    if (container) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => resizeObserver.disconnect();
    }
  }, [container]);

  useEffect(() => {
    handleResize.cancel();
    parseTextForTruncation(text);
  }, [text, start, end]);

  return (
    <div ref={setContainer} style={containerStyle} className={cnTw('w-full', className)}>
      <p ref={textRef} className="hidden">
        {text}
      </p>
      <p ref={ellipsisRef} className="hidden">
        {ellipsis}
      </p>
      {truncatedText}
    </div>
  );
});
