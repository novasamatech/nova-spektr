import { useEffect, useState } from 'react';

import { type ToastNotification } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';

type Props = {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
};

const variantStyles = {
  default: 'bg-white border-border-light',
  success: 'bg-green-50 border-border-success',
  warning: 'bg-yellow-50 border-border-warning',
  error: 'bg-red-50 border-border-error',
  info: 'bg-blue-50 border-border-info',
};

const variantIconColors = {
  default: 'text-text-secondary',
  success: 'text-border-success',
  warning: 'text-border-warning',
  error: 'text-border-error',
  info: 'text-border-info',
};

export const Toast = ({ toast, onDismiss }: Props) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200); // Match animation duration
  };

  const handleClick = () => {
    handleDismiss();
  };

  return (
    <div
      className={cnTw(
        'pointer-events-auto mb-3 flex max-w-80 cursor-pointer items-start gap-3 rounded-lg border p-4 shadow-modal transition-all duration-200 hover:shadow-lg',
        variantStyles[toast.variant],
        {
          'translate-x-0 opacity-100': isVisible && !isExiting,
          'translate-x-full opacity-0': !isVisible || isExiting,
        },
      )}
      role="alert"
      aria-live="polite"
      onClick={handleClick}
    >
      <div className="flex-1 text-sm text-text-primary">{toast.content}</div>

      <IconButton
        name="close"
        size={16}
        className={cnTw('shrink-0', variantIconColors[toast.variant])}
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
      />
    </div>
  );
};
