import { type ReactNode } from 'react';

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export type ToastNotificationProps = {
  content: ReactNode;
  duration?: number; // in milliseconds, 0 means no auto-dismiss, default is 3000
  position?: ToastPosition;
  variant?: ToastVariant;
  onDismiss?: () => void;
};

export type ToastNotification = Required<ToastNotificationProps> & {
  id: string;
  createdAt: number;
};

export type ModalNotificationProps = {
  content: ReactNode;
  size?: 'sm' | 'md' | 'mdlg' | 'lg' | 'xl' | 'xxl' | 'full' | 'fit';
  height?: 'full' | 'lg' | 'fit';
  title?: string;
  showCloseButton?: boolean;
  duration?: number; // in milliseconds, 0 means no auto-dismiss, default is 3000
  onClose?: () => void;
};

export type ModalNotification = Required<ModalNotificationProps> & {
  id: string;
  onClose?: () => void;
};
