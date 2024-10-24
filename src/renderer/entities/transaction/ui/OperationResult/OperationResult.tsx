import { type PropsWithChildren, useEffect, useRef } from 'react';

import { Icon, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';

import { VariantAnimationProps } from './common/constants';
import { type Variant } from './common/types';

type Props = {
  title: string;
  variant?: Variant;
  description?: string;
  autoCloseTimeout?: number;
  isOpen: boolean;
  onClose: () => void;
};

export const OperationResult = ({
  title,
  variant = 'success',
  description,
  autoCloseTimeout = 0,
  isOpen,
  children,
  onClose,
}: PropsWithChildren<Props>) => {
  const closingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [autoCloseTimeout]);

  return (
    <StatusModal
      content={
        variant === 'warning' ? (
          <Icon name="warn" size={48} className="m-4" />
        ) : (
          <Animation variant={variant} {...VariantAnimationProps[variant]} />
        )
      }
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      {children}
    </StatusModal>
  );
};
