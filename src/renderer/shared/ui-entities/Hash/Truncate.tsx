import { type CSSProperties, memo, useRef, useState } from 'react';

import { useDebouncedCallback } from '../../lib/hooks';
import { nullable } from '../../lib/utils';
import { useResizeObserver } from '../../ui-kit';

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

export const Truncate = memo<Props>(({ text, ellipsis = '...' }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const textRef = useRef<HTMLElement>(null);
  const ellipsisRef = useRef<HTMLElement>(null);

  const [truncatedText, setTruncatedText] = useState(text);

  const calculateMeasurements = () => {
    return {
      container: getContainerMeasurement(container),
      ellipsis: getTextMeasurement(ellipsisRef.current),
      text: getTextMeasurement(textRef.current, text),
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
        charWidth,
    );

    const lettersToRemove = Math.ceil(delta / charWidth);
    const center = Math.round(text.length / 2);
    const removeStart = center - Math.ceil(lettersToRemove / 2);
    const removeEnd = removeStart + lettersToRemove;

    const leftSide = text.slice(0, Math.max(MIN_START_SYMBOLS, removeStart));
    const rightSide = text.slice(Math.min(removeEnd, text.length - MIN_END_SYMBOLS));

    return `${leftSide}${ellipsis}${rightSide}`;
  };

  const parseTextForTruncation = (text: string) => {
    const measurements = calculateMeasurements();
    if (!measurements.text.width || !measurements.container.width) {
      return;
    }

    const truncatedText =
      measurements.text.width.value > measurements.container.width.value ? truncateText(measurements) : text;

    setTruncatedText(truncatedText);
  };

  const handleResize = useDebouncedCallback(0, () => {
    parseTextForTruncation(text);
  });

  useResizeObserver(container, handleResize);

  return (
    <span ref={setContainer} style={containerStyle} className="block w-full max-w-full">
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
