import { type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { ConfirmModal } from '@/shared/ui-kit';

import { VariantAnimationProps } from './common/constants';
import { type Variant } from './common/types';

type Props = {
  title: string;
  variant?: Variant;
  content?: ReactNode;
  description?: string;
  autoCloseTimeout?: number;
  isOpen: boolean;
  confirmClose?: boolean;
  onClose: () => void;
};

export const OperationResult = ({
  title,
  content,
  variant = 'success',
  description,
  autoCloseTimeout = 0,
  isOpen,
  confirmClose = false,
  children,
  onClose,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const closingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClose = () => {
    if (confirmClose && variant === 'loading') {
      setShowConfirm(true);

      return;
    }
    onClose();
  };

  useEffect(() => {
    if (autoCloseTimeout <= 0) {
      return;
    }

    let mounted = true;

    if (closingTimeout.current) {
      clearTimeout(closingTimeout.current);
      closingTimeout.current = null;
    }

    if (autoCloseTimeout) {
      closingTimeout.current = setTimeout(() => {
        if (mounted) {
          onClose();
        }
      }, autoCloseTimeout);
    }

    return () => {
      mounted = false;
    };
  }, [autoCloseTimeout, isOpen]);

  return (
    <>
      <StatusModal
        content={
          content ??
          (variant === 'warning' ? (
            <Icon name="warn" size={48} className="m-4" />
          ) : (
            <Animation variant={variant} {...VariantAnimationProps[variant]} />
          ))
        }
        title={title}
        description={description}
        isOpen={isOpen}
        onClose={handleClose}
      >
        {children}
      </StatusModal>
      {confirmClose && (
        <ConfirmModal
          isOpen={showConfirm}
          title={t('operation.submitCloseConfirmTitle')}
          description={t('operation.submitCloseConfirmDescription')}
          cancelText={t('operation.submitCloseConfirmLeave')}
          confirmText={t('operation.submitCloseConfirmStay')}
          onCancel={() => {
            setShowConfirm(false);
            onClose();
          }}
          onConfirm={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};
