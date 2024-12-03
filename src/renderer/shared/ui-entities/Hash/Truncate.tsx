import { type CSSProperties, memo, useEffect, useRef, useState } from 'react';

import { Box, Skeleton, useResizeObserver } from '@/shared/ui-kit';

const divWithPrecision = (a: number, b: number) => {
  return (a * 100_000) / b / 100_000;
};

const containerStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const MIN_START_SYMBOLS = 5;
const MIN_END_SYMBOLS = 5;

type Props = {
  text: string;
  ellipsis?: string;
};

export const Truncate = memo(({ text, ellipsis = '...' }: Props) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const textRef = useRef<HTMLElement>(null);
  const ellipsisRef = useRef<HTMLElement>(null);

  const [gotFirstCalculation, setGotFirstCalculation] = useState(false);
  const [truncatedText, setTruncatedText] = useState(text);

  const calculateMeasurements = () => {
    return {
      container: container?.offsetWidth ?? 0,
      ellipsis: ellipsisRef.current?.offsetWidth ?? 0,
      text: textRef.current?.offsetWidth ?? 0,
    };
  };

  const truncateText = (measurements: ReturnType<typeof calculateMeasurements>, text: string) => {
    const containerWidth = measurements.container;
    const ellipsisWidth = measurements.ellipsis;
    const textWidth = measurements.text;

    if (!containerWidth || !ellipsisWidth || !textWidth) {
      return '';
    }

    if (containerWidth <= ellipsisWidth) {
      return ellipsis;
    }

    const charWidth = divWithPrecision(textWidth, text.length);
    const delta = Math.ceil(textWidth - containerWidth + ellipsisWidth + charWidth / 2);

    const lettersToRemove = Math.ceil(divWithPrecision(delta, charWidth));

    const center = Math.round(text.length / 2);
    const removeStart = center - Math.ceil(lettersToRemove / 2);
    const removeEnd = removeStart + lettersToRemove;

    const leftSide = text.slice(0, Math.max(MIN_START_SYMBOLS, removeStart));
    const rightSide = text.slice(Math.min(removeEnd, text.length - MIN_END_SYMBOLS));

    return `${leftSide}${ellipsis}${rightSide}`;
  };

  const parseTextForTruncation = (text: string) => {
    const measurements = calculateMeasurements();
    if (!measurements.text || !measurements.container) {
      return;
    }

    const truncatedText = measurements.text > measurements.container ? truncateText(measurements, text) : text;

    setTruncatedText(truncatedText);
    setGotFirstCalculation(true);
  };

  useResizeObserver(container, () => {
    parseTextForTruncation(text);
  });

  useEffect(() => {
    parseTextForTruncation(text);
  }, [text]);

  return (
    <span ref={setContainer} style={containerStyle} className="relative block w-full max-w-full">
      <span ref={textRef} className="invisible block w-fit">
        {text}
      </span>
      <span ref={ellipsisRef} className="invisible absolute">
        {ellipsis}
      </span>
      <span className="absolute inset-0">
        {gotFirstCalculation ? (
          truncatedText
        ) : (
          <Box fillContainer verticalAlign="center">
            <Skeleton width={`${text.length}ch`} height="1em" />
          </Box>
        )}
      </span>
    </span>
  );
});
