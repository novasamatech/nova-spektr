import { type CSSProperties, memo, useRef, useState } from 'react';

import { Skeleton, useResizeObserver } from '@/shared/ui-kit';

import { getContainerMeasurement, getTextMeasurement } from './utils';

type Props = {
  text: string;
  ellipsis?: string;
};

const containerStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const MIN_START_SYMBOLS = 5;
const MIN_END_SYMBOLS = 5;

export const Truncate = memo(({ text, ellipsis = '...' }: Props) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const textRef = useRef<HTMLElement>(null);
  const ellipsisRef = useRef<HTMLElement>(null);

  const [gotFirstCalculation, setGotFirstCalculation] = useState(false);
  const [truncatedText, setTruncatedText] = useState(text);

  const calculateMeasurements = () => {
    /**
     * Uppercase letter occupies more space, so fixedText is a little wider and
     * safer for calculation (reduces change to trim last char).
     */
    const fixedText = text.toUpperCase();
    const center = Math.round(text.length / 2);
    const stringStart = fixedText.substring(0, center);
    const stringEnd = fixedText.substring(center);

    return {
      container: getContainerMeasurement(container),
      ellipsis: getTextMeasurement(ellipsisRef.current, ellipsis),
      start: getTextMeasurement(textRef.current, stringStart),
      end: getTextMeasurement(textRef.current, stringEnd),
    };
  };

  const truncateText = (measurements: ReturnType<typeof calculateMeasurements>, text: string) => {
    const containerWidth = measurements.container.width;
    const ellipsisWidth = measurements.ellipsis.width;
    const startWidth = measurements.start.width;
    const endWidth = measurements.end.width;

    if (!containerWidth || !ellipsisWidth || !startWidth || !endWidth) {
      return '';
    }

    if (containerWidth <= ellipsisWidth) {
      return ellipsis;
    }

    const startText = measurements.start.text;
    const endText = measurements.end.text;

    const startCharWidth = startWidth / startText.length;
    const endCharWidth = endWidth / endText.length;

    const halfOfSpace = (containerWidth - ellipsisWidth) / 2;
    const startDelta = startWidth - halfOfSpace;
    const endDelta = endWidth - halfOfSpace - startCharWidth / 2;

    const removeStart = Math.ceil(startDelta / startCharWidth);
    const removeEnd = Math.ceil(endDelta / endCharWidth);

    const leftSide = text.slice(0, Math.max(MIN_START_SYMBOLS, startText.length - removeStart));
    const rightSide = text.slice(Math.min(text.length - endText.length + removeEnd, text.length - MIN_END_SYMBOLS));

    return `${leftSide}${ellipsis}${rightSide}`;
  };

  const parseTextForTruncation = (text: string) => {
    const measurements = calculateMeasurements();
    if (!measurements.start.width || !measurements.end.width || !measurements.container.width) {
      return;
    }

    const totalWidth = measurements.start.width + measurements.end.width;
    const truncatedText = totalWidth > measurements.container.width ? truncateText(measurements, text) : text;

    setTruncatedText(truncatedText);
    setGotFirstCalculation(true);
  };

  useResizeObserver(container, () => {
    parseTextForTruncation(text);
  });

  return (
    <span ref={setContainer} style={containerStyle} className="relative block w-full max-w-full">
      <span ref={textRef} className="invisible">
        {text}
      </span>
      <span ref={ellipsisRef} className="hidden">
        {ellipsis}
      </span>
      <span className="absolute inset-0">
        {gotFirstCalculation ? truncatedText : <Skeleton width="100%" height="100%" />}
      </span>
    </span>
  );
});
