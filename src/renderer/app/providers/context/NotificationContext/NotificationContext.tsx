import noop from 'lodash/noop';
import { nanoid } from 'nanoid';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type ModalNotification,
  type ModalNotificationProps,
  type ToastNotification,
  type ToastNotificationProps,
} from '@/shared/core/types/notificationService';
import { DEFAULT_TRANSITION, nullable } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';

import { ToastContainer } from './ToastContainer';

type NotificationContextProps = {
  toast: (props: ToastNotificationProps) => string;
  modal: (props: ModalNotificationProps) => void;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
};

const NotificationContext = createContext<NotificationContextProps>({} as NotificationContextProps);

const MAX_TOASTS = 5;
const DEFAULT_NOTIFICATION_DURATION = 3000;
const NO_AUTO_DISMISS = 0;

const createToastNotification = (props: ToastNotificationProps): ToastNotification => ({
  content: props.content,
  id: nanoid(),
  createdAt: Date.now(),
  position: props.position || 'bottom-right',
  variant: props.variant || 'default',
  duration: props.duration ?? DEFAULT_NOTIFICATION_DURATION,
  onDismiss: props.onDismiss ?? noop,
});

const createModalNotification = (props: ModalNotificationProps): ModalNotification => ({
  content: props.content,
  title: props.title ?? '',
  id: nanoid(),
  size: props.size || 'fit',
  height: props.height || 'fit',
  showCloseButton: props.showCloseButton ?? false,
  duration: props.duration ?? DEFAULT_NOTIFICATION_DURATION,
  onClose: props.onClose ?? noop,
});

const shouldAutoDismiss = (duration: number): boolean => duration > NO_AUTO_DISMISS;

const scheduleAutoDismiss = (callback: () => void, duration: number): void => {
  if (shouldAutoDismiss(duration)) {
    setTimeout(callback, duration);
  }
};

const clearTimeoutSafely = (timeoutRef: React.RefObject<NodeJS.Timeout | null>): void => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
};

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [currentModal, setCurrentModal] = useState<ModalNotification | null>(null);

  const modalQueue = useRef<ModalNotification[]>([]);
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToastToQueue = useCallback((notification: ToastNotification): void => {
    setToasts((previousToasts) => {
      const updatedToasts = [notification, ...previousToasts];
      return updatedToasts.slice(0, MAX_TOASTS);
    });
  }, []);

  const toast = useCallback((props: ToastNotificationProps): string => {
    const notification = createToastNotification(props);

    addToastToQueue(notification);
    scheduleAutoDismiss(() => dismissToast(notification.id), notification.duration);

    return notification.id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((previousToasts) => {
      const toastToRemove = previousToasts.find((toast) => toast.id === id);
      toastToRemove?.onDismiss?.();
      return previousToasts.filter((toast) => toast.id !== id);
    });
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts((previousToasts) => {
      for (const toast of previousToasts) {
        toast.onDismiss?.();
      }
      return [];
    });
  }, []);

  const processModalQueue = useCallback(() => {
    const nextModal = modalQueue.current.shift();
    if (nullable(nextModal)) return;

    setCurrentModal(nextModal);
    setIsModalOpen(true);
  }, []);

  const showModalImmediately = useCallback((notification: ModalNotification): void => {
    setCurrentModal(notification);
    setIsModalOpen(true);
  }, []);

  const queueModal = useCallback((notification: ModalNotification): void => {
    modalQueue.current.push(notification);
  }, []);

  const modal = useCallback(
    (props: ModalNotificationProps): void => {
      const notification = createModalNotification(props);
      const isModalCurrentlyOpen = currentModal !== null;
      if (!isModalCurrentlyOpen) {
        showModalImmediately(notification);
        return;
      }
      queueModal(notification);
    },
    [currentModal, showModalImmediately, queueModal],
  );

  const handleModalClose = useCallback(() => {
    if (!currentModal) return;

    clearTimeoutSafely(modalTimeoutRef);
    currentModal.onClose?.();

    setCurrentModal(null);
    setIsModalOpen(false);

    setTimeout(() => processModalQueue(), DEFAULT_TRANSITION);
  }, [currentModal, processModalQueue]);

  useEffect(() => {
    const isModalOpenWithAutoDismiss = isModalOpen && currentModal && shouldAutoDismiss(currentModal.duration);

    if (isModalOpenWithAutoDismiss) {
      modalTimeoutRef.current = setTimeout(handleModalClose, currentModal.duration);
    }

    return () => clearTimeoutSafely(modalTimeoutRef);
  }, [currentModal, isModalOpen, handleModalClose]);

  const value = useMemo(
    () => ({
      toast,
      modal,
      dismissToast,
      dismissAllToasts,
    }),
    [toast, modal, dismissToast, dismissAllToasts],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {currentModal && (
        <Modal isOpen={isModalOpen} size={currentModal.size} height={currentModal.height} onToggle={handleModalClose}>
          {currentModal.title && <Modal.Title close={currentModal.showCloseButton}>{currentModal.title}</Modal.Title>}
          <Modal.Content>{currentModal.content}</Modal.Content>
        </Modal>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext<NotificationContextProps>(NotificationContext);
