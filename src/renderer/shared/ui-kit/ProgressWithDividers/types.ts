import { type CalculatedSegment } from './utils';

export interface SegmentConfig {
  id: string;
  title: string;
  topLabel: string;
  color: string; // Tailwind background color class (e.g., 'bg-blue-500')
  width: number; // Width in pixels
}

export interface ProgressWithDividersProps {
  segments: SegmentConfig[];
  currentSegmentId: string;
  onSegmentClick?: (segmentId: string) => void;
  className?: string;
  lastLabel?: string;
  bottomLabelPrefix?: string;
}

export interface TopLabelPosition {
  index: number;
  left: string;
  width: string;
  align: string;
}

export interface SegmentPosition {
  containerLeft: string;
  containerWidth: string;
  textWidth: string;
}

export interface TopLabelsProps {
  calculatedSegments: CalculatedSegment[];
  lastLabel?: string;
}

export interface SegmentProps {
  calculatedSegment: CalculatedSegment;
  bottomLabelPrefix: string;
  onSegmentClick: (segmentId: string) => void;
}

export interface TimelineSegmentProps {
  segment: CalculatedSegment;
  index: number;
  segments: CalculatedSegment[];
  currentIndex: number;
  isActive: boolean;
  nextIsActive: boolean;
  isPartialProgress: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  isSelectedBoundary: boolean;
  selectedSegmentId: string;
  bottomLabelPrefix: string;
  onSegmentClick: (segmentId: string) => void;
}

export interface SegmentsProps {
  calculatedSegments: CalculatedSegment[];
  bottomLabelPrefix: string;
  onSegmentClick: (segmentId: string) => void;
}

export interface SegmentLabelsProps {
  calculatedSegments: CalculatedSegment[];
  bottomLabelPrefix: string;
}
