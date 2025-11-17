import { memo, useId } from 'react';

type Props = {
  value: number;
  max: number;
  variant?: 'green' | 'grey';
  size?: number;
};

const gradientColors = {
  green: { start: '#AEE3C1', end: '#01A63E' },
  grey: { start: '#E6E6E6', end: '#ABABAB' },
};

const radius = 40;
const strokeWidth = 12;
const center = 50;

export const Speedometer = memo(({ value, max, variant = 'green', size = 32 }: Props) => {
  const gradientId = useId();

  const percentage = Math.min(Math.max(value / max, 0), 1);

  const colors = gradientColors[variant];

  const startAngle = 135;
  const totalAngle = 270;
  const filledAngle = totalAngle * percentage;

  const createArc = (angle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Calculate gradient start and end points along the arc
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + filledAngle) * Math.PI) / 180;

  const gradientX1 = center + radius * Math.cos(startRad);
  const gradientY1 = center + radius * Math.sin(startRad);
  const gradientX2 = center + radius * Math.cos(endRad);
  const gradientY2 = center + radius * Math.sin(endRad);

  // Calculate needle end point (extended to outer edge with 2% angle offset)
  const needleAngleOffset = value > 0 ? totalAngle * 0.015 : -4;
  const needleEndRad = ((startAngle + filledAngle + needleAngleOffset) * Math.PI) / 180;
  const needleRadius = radius + strokeWidth / 4;
  const needleX2 = center + needleRadius * Math.cos(needleEndRad);
  const needleY2 = center + needleRadius * Math.sin(needleEndRad);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rotate-0">
      <defs>
        <linearGradient
          id={gradientId}
          x1={gradientX1}
          y1={gradientY1}
          x2={gradientX2}
          y2={gradientY2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>
      <path d={createArc(totalAngle)} fill="none" stroke="#F4F4F8" strokeWidth={strokeWidth} strokeLinecap="round" />
      {value > 0 && (
        <path
          d={createArc(filledAngle)}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      <line
        x1={center}
        y1={center}
        x2={needleX2}
        y2={needleY2}
        stroke={colors.end}
        strokeWidth={strokeWidth / 2}
        strokeLinecap="round"
      />
    </svg>
  );
});
