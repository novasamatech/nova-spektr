import ArrowsSprite from '@images/icons/arrows.svg';

export const ArrowImages = {
  'arrow-curve-left': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#arrow-curve-left-16`,
      20: `${ArrowsSprite}#arrow-curve-left-20`,
    },
  },
  'arrow-diagonal': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#arrow-diagonal-16`,
      20: `${ArrowsSprite}#arrow-diagonal-20`,
    },
  },
  'arrow-down': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#arrow-down-16`,
      20: `${ArrowsSprite}#arrow-down-20`,
    },
  },
  'arrow-left': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#arrow-left-16`,
      20: `${ArrowsSprite}#arrow-left-20`,
    },
  },
  'arrow-right': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#arrow-right-16`,
      20: `${ArrowsSprite}#arrow-right-20`,
    },
  },
  'arrow-up': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#arrow-up-16`,
      20: `${ArrowsSprite}#arrow-up-20`,
    },
  },
  'chevron-down': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#chevron-down-16`,
      20: `${ArrowsSprite}#chevron-down-20`,
    },
  },
  'chevron-right': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#chevron-right-16`,
      20: `${ArrowsSprite}#chevron-right-20`,
    },
  },
  'chevron-up': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#chevron-up-16`,
      20: `${ArrowsSprite}#chevron-up-20`,
    },
  },
  'dropdown-down': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#dropdown-down-16`,
      20: `${ArrowsSprite}#dropdown-down-20`,
    },
  },
  'dropdown-right': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#dropdown-right-16`,
      20: `${ArrowsSprite}#dropdown-right-20`,
    },
  },
  'dropdown-up': {
    svg: true,
    size: {
      16: `${ArrowsSprite}#dropdown-up-16`,
      20: `${ArrowsSprite}#dropdown-up-20`,
    },
  },
} as const;

export type Arrows = keyof typeof ArrowImages;
