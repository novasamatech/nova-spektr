import StatusSprite from '@images/icons/status.svg';

export const StatusImages = {
  'status-error': {
    svg: true,
    size: { 16: `${StatusSprite}#status-error-16` },
  },
  'status-success': {
    svg: true,
    size: { 16: `${StatusSprite}#status-success-16` },
  },
  'status-warning': {
    svg: true,
    size: { 16: `${StatusSprite}#status-warning-16` },
  },
} as const;

export type Status = keyof typeof StatusImages;
