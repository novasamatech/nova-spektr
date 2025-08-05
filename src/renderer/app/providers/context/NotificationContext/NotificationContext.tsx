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
} from '@/shared/core/types/notification-service';
import { useToggle } from '@/shared/lib/hooks';
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

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const [isModalOpen, toggleModal] = useToggle();

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [currentModal, setCurrentModal] = useState<ModalNotification | null>(null);

  const modalQueue = useRef<ModalNotification[]>([]);
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback((props: ToastNotificationProps): string => {
    const id = nanoid();
    const notification: ToastNotification = {
      content: props.content,
      id,
      createdAt: Date.now(),
      position: props.position || 'bottom-right',
      variant: props.variant || 'default',
      duration: props.duration ?? 3000,
      onDismiss: props.onDismiss ?? noop,
    };

    setToasts((prev) => {
      const newToasts = [notification, ...prev];
      // Keep only the most recent toasts if we exceed the limit
      return newToasts.slice(0, MAX_TOASTS);
    });

    // Auto-dismiss if duration is set
    if (notification.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toastToRemove = prev.find((t) => t.id === id);
      if (toastToRemove?.onDismiss) {
        toastToRemove.onDismiss();
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts((prev) => {
      for (const toast of prev) {
        if (toast.onDismiss) {
          toast.onDismiss();
        }
      }
      return [];
    });
  }, []);

  const processModalQueue = useCallback(() => {
    const nextModal = modalQueue.current.shift();
    if (nullable(nextModal)) return;

    setCurrentModal(nextModal);
    toggleModal();
  }, [toggleModal]);

  const modal = useCallback(
    (props: ModalNotificationProps): void => {
      const notification: ModalNotification = {
        content: props.content,
        title: props.title ?? '',
        id: nanoid(),
        size: props.size || 'sm',
        height: props.height || 'fit',
        showCloseButton: props.showCloseButton ?? false,
        duration: props.duration ?? 0,
        onClose: props.onClose ?? noop,
      };

      // If no modal is currently open, show immediately
      if (!currentModal) {
        setCurrentModal(notification);
        toggleModal();
      } else {
        // Queue the modal
        modalQueue.current.push(notification);
      }
    },
    [currentModal, toggleModal],
  );

  const handleModalClose = useCallback(() => {
    if (currentModal) {
      // Clear any existing timeout
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }

      // Call onClose callback if provided
      if (currentModal.onClose) {
        currentModal.onClose();
      }

      setCurrentModal(null);
      toggleModal();

      // Process next modal in queue after transition
      setTimeout(() => {
        processModalQueue();
      }, DEFAULT_TRANSITION);
    }
  }, [currentModal, toggleModal, processModalQueue]);

  // Set up auto-close timeout when modal is shown
  useEffect(() => {
    if (currentModal?.duration && isModalOpen) {
      modalTimeoutRef.current = setTimeout(() => {
        handleModalClose();
      }, currentModal.duration);
    }

    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
        modalTimeoutRef.current = null;
      }
    };
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
