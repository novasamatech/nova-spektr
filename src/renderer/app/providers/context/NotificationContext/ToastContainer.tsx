import { createPortal } from 'react-dom';

import { type ToastNotification, type ToastPosition } from '@/shared/core';
import { cnTw, entries } from '@/shared/lib/utils';
import { useTheme } from '@/shared/ui-kit/Theme/useTheme';

import { Toast } from './Toast';

type Props = {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
};

const positionStyles: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

export const ToastContainer = ({ toasts, onDismiss }: Props) => {
  const { portalContainer } = useTheme();

  if (!portalContainer || toasts.length === 0) {
    return null;
  }

  // Group toasts by position
  const toastsByPosition = toasts.reduce(
    (acc, toast) => {
      const position = toast.position;
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(toast);
      return acc;
    },
    {} as Record<ToastPosition, ToastNotification[]>,
  );

  return createPortal(
    <>
      {entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={cnTw('pointer-events-none fixed z-50 flex flex-col', positionStyles[position as ToastPosition], {
            'items-start': position.includes('left'),
            'items-center': position.includes('center'),
            'items-end': position.includes('right'),
          })}
        >
          {positionToasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </div>
      ))}
    </>,
    portalContainer,
  );
};
