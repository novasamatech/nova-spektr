import { type CSSProperties, memo, useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from '@/shared/lib/hooks';
import { cnTw, nullable } from '@/shared/lib/utils';

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
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const textRef = useRef<HTMLElement>(null);
  const ellipsisRef = useRef<HTMLElement>(null);

  const [truncatedText, setTruncatedText] = useState(text);

  const calculateMeasurements = () => {
    return {
      container: getContainerMeasurement(container),
      ellipsis: getTextMeasurement(ellipsisRef.current),
      text: getTextMeasurement(textRef.current),
    };
  };

  const truncateText = (measurements: ReturnType<typeof calculateMeasurements>) => {
    const containerWidth = measurements.container.width?.value;
    const ellipsisWidth = measurements.ellipsis.width?.value;
    const textWidth = measurements.text.width?.value;

    if (nullable(containerWidth) || nullable(ellipsisWidth) || nullable(textWidth)) {
      return '';
    }

    if (containerWidth <= ellipsisWidth) {
      return ellipsis;
    }

    const charWidth = textWidth / text.length;
    const delta = Math.ceil(
      textWidth -
        containerWidth +
        ellipsisWidth +
        // special fix for wide characters like W,M,etc.
        charWidth / 8,
    );

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

    if (!measurements.text.width || !measurements.container.width) {
      return;
    }

    const truncatedText =
      measurements.text.width.value > measurements.container.width.value ? truncateText(measurements) : text;

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
    <span ref={setContainer} style={containerStyle} className={cnTw('block w-full max-w-full', className)}>
      <span ref={textRef} className="hidden">
        {text}
      </span>
      <span ref={ellipsisRef} className="hidden">
        {ellipsis}
      </span>
      {truncatedText}
    </span>
  );
});
