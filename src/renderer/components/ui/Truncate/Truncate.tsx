import { CSSProperties, useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';

import { getTextMeasurement, getContainerMeasurement } from './utils';

type Props = {
  text: string;
  ellipsis: string;
  end: number;
  start: number;
  className?: string;
  style?: CSSProperties;
};

const Truncate = ({ text, ellipsis, end, start, className = '', style = {} }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLElement>(null);
  const ellipsisRef = useRef<HTMLElement>(null);

  const [truncatedText, setTruncatedText] = useState(text);

  const calculateMeasurements = () => {
    return {
      container: getContainerMeasurement(containerRef.current),
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
    const charWidth = measurements.text.width.value / text.length;

    const lettersToRemove = Math.ceil(delta / charWidth);
    const center = Math.round(text.length / 2);
    const removeStart = center - Math.ceil(lettersToRemove / 2);
    const removeEnd = removeStart + lettersToRemove;

    const leftSide = text.slice(0, Math.max(start, removeStart));
    const rightSide = text.slice(Math.min(removeEnd, text.length - end));

    return `${leftSide}${ellipsis}${rightSide}`;
  };

  const parseTextForTruncation = debounce((text: string) => {
    const measurements = calculateMeasurements();

    const truncatedText =
      Math.round(measurements.text.width.value) > Math.round(measurements.container.width.value)
        ? truncateText(measurements)
        : text;

    setTruncatedText(truncatedText);
  }, 0);

  const onResize = debounce(() => {
    parseTextForTruncation(text);
  }, 100);

  useEffect(() => {
    parseTextForTruncation(text);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      onResize.cancel();
      parseTextForTruncation.cancel();
    };
  }, []);

  useEffect(() => {
    parseTextForTruncation(text);
  }, [text, start, end]);

  const containerStyle = {
    ...style,
    display: 'block',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  } as CSSProperties;

  return (
    <div ref={containerRef} style={containerStyle} className={className}>
      <span ref={textRef} className="hidden">
        {text}
      </span>
      <span ref={ellipsisRef} className="hidden">
        {ellipsis}
      </span>

      {truncatedText}
    </div>
  );
};

export default Truncate;
