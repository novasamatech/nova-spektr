const DEFAULT_CANVAS = document.createElement('canvas');
const DEFAULT_FONT_WEIGHT = 400;
const DEFAULT_FONT_STYLE = 'normal';

const measureText = ({
  text,
  fontFamily,
  fontSize,
  fontWeight = DEFAULT_FONT_WEIGHT,
  fontStyle = DEFAULT_FONT_STYLE,
  canvas = DEFAULT_CANVAS,
}: {
  text: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  canvas?: HTMLCanvasElement;
}) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context.');
  }

  ctx.font = `${fontWeight} ${fontStyle} ${fontSize} ${fontFamily}`;

  return {
    text,
    width: ctx.measureText(text).width,
  };
};

export const getTextMeasurement = (ref: HTMLElement | null, text: string) => {
  if (!ref) {
    return { text };
  }

  const { fontFamily, fontSize, fontWeight, fontStyle } = window.getComputedStyle(ref);

  const { width } = measureText({
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
  });

  return { text, width };
};

export const getContainerMeasurement = (ref: HTMLElement | null) => {
  return {
    width: ref?.offsetWidth ?? 0,
  };
};
