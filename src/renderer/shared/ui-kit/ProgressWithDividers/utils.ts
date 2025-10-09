import { type SegmentConfig } from './types';

export interface SegmentState {
  isActive: boolean;
  nextIsActive: boolean;
  isPartialProgress: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  isSelectedBoundary: boolean;
  isCurrent: boolean;
  isLast: boolean;
}

export interface CalculatedSegment extends SegmentConfig {
  state: SegmentState;
  position: {
    containerLeft: string;
    containerWidth: string;
    textWidth: string;
  };
  topLabelPosition: {
    left: string;
    align: string;
  };
}

export const calculateSegmentStates = (
  segments: SegmentConfig[],
  currentSegmentId: string,
  selectedSegmentId: string | null,
): SegmentState[] => {
  const currentIndex = segments.findIndex(segment => segment.id === currentSegmentId);
  const selectedIndex = selectedSegmentId ? segments.findIndex(segment => segment.id === selectedSegmentId) : -1;

  return segments.map((segment, index) => {
    const isActive = index <= currentIndex;
    const nextIsActive = index < currentIndex;
    const isPartialProgress = index === currentIndex && index < segments.length - 1;
    const isSelected = selectedSegmentId === segment.id;
    const hasSelection = selectedSegmentId !== null;
    const isSelectedBoundary =
      hasSelection && (index === selectedIndex || (index === selectedIndex + 1 && index < segments.length));
    const isCurrent = segment.id === currentSegmentId;
    const isLast = index === segments.length - 1;

    return {
      isActive,
      nextIsActive,
      isPartialProgress,
      isSelected,
      hasSelection,
      isSelectedBoundary,
      isCurrent,
      isLast,
    };
  });
};

export const calculatePositions = (segments: SegmentConfig[]) => {
  let currentLeft = 0;

  const topLabelPositions = segments.map((segment, _index) => {
    const widthValue = segment.width;
    const isFirst = _index === 0;

    let left: string;
    let align: string;

    if (isFirst) {
      left = '0px';
      align = 'items-start';
    } else {
      left = `${currentLeft}px`;
      align = 'items-center';
    }

    currentLeft += widthValue;

    return {
      index: _index,
      left,
      width: 'auto',
      align,
    };
  });

  currentLeft = 0;
  const segmentPositions = segments.map((segment, _index) => {
    const widthValue = segment.width;
    const containerLeft = `${currentLeft}px`;
    const containerWidth = `${widthValue}px`;
    const textWidth = `${Math.min(widthValue - 8, 80)}px`;

    currentLeft += widthValue;

    return {
      containerLeft,
      containerWidth,
      textWidth,
    };
  });

  return { topLabelPositions, segmentPositions };
};

export const calculateTotalWidth = (segments: SegmentConfig[]): number => {
  return segments.reduce((sum, segment) => sum + segment.width, 0);
};

export const calculateSegmentsWithState = (
  segments: SegmentConfig[],
  currentSegmentId: string,
  selectedSegmentId: string | null,
): CalculatedSegment[] => {
  const states = calculateSegmentStates(segments, currentSegmentId, selectedSegmentId);
  const { topLabelPositions, segmentPositions } = calculatePositions(segments);

  return segments.map((segment, index) => ({
    ...segment,
    state: states[index]!,
    position: segmentPositions[index]!,
    topLabelPosition: {
      left: topLabelPositions[index]!.left,
      align: topLabelPositions[index]!.align,
    },
  }));
};
