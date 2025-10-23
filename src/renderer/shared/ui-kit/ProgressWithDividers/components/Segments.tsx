import { memo } from 'react';

import { type SegmentsProps } from '../types';

import { Segment } from './Segment';

export const Segments = memo(({ calculatedSegments, bottomLabelPrefix, onSegmentClick }: SegmentsProps) => (
  <div className="absolute top-[22px] left-0 flex content-stretch items-center">
    {calculatedSegments.map(calculatedSegment => (
      <Segment
        key={`segment-${calculatedSegment.id}`}
        calculatedSegment={calculatedSegment}
        bottomLabelPrefix={bottomLabelPrefix}
        onSegmentClick={onSegmentClick}
      />
    ))}
  </div>
));

Segments.displayName = 'Segments';
