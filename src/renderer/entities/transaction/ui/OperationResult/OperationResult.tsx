import { type PropsWithChildren } from 'react';

import { Icon, StatusModal } from '@shared/ui';
import { Animation } from '@shared/ui/Animation/Animation';

import { VariantAnimationProps } from './common/constants';
import { type Variant } from './common/types';

type Props = {
  title: string;
  variant?: Variant;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
};

export const OperationResult = ({
  title,
  variant = 'success',
  description,
  isOpen,
  children,
  onClose,
}: PropsWithChildren<Props>) => (
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
