import noop from 'lodash/noop';
import { nanoid } from 'nanoid';
import {
  type PropsWithChildren,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Toaster, toast } from 'sonner';

import { type ModalNotification, type ModalNotificationProps } from '@/shared/core/types/notificationService';
import { DEFAULT_TRANSITION, nullable } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Modal } from '../Modal/Modal';

type NotificationContextProps = {
  modal: (props: ModalNotificationProps) => void;
  toast: typeof toast;
};

const NotificationContext = createContext<NotificationContextProps>({ modal: noop, toast });

const DEFAULT_NOTIFICATION_DURATION = 3000;
const NO_AUTO_DISMISS = 0;

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

const clearTimeoutSafely = (timeoutRef: RefObject<NodeJS.Timeout | null>): void => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
};

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModal, setCurrentModal] = useState<ModalNotification | null>(null);

  const modalQueue = useRef<ModalNotification[]>([]);
  const modalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      modal,
      toast,
    }),
    [modal],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <Toaster
        icons={{
          success: <Icon name="checkmarkOutline" size={16} className="text-icon-positive" />,
          error: <Icon name="closeOutline" size={16} className="text-icon-negative" />,
          loading: <Icon name="loader" size={16} className="animate-spin text-icon-accent" />,
        }}
        toastOptions={{
          classNames: {
            toast: 'pointer-events-auto',
            actionButton: 'pointer-events-auto',
            cancelButton: 'pointer-events-auto',
            closeButton: 'pointer-events-auto',
            icon: 'self-start mt-0.5',
          },
        }}
      />

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
