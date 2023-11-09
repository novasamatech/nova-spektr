import { PropsWithChildren } from 'react';

import { StatusModal } from '@renderer/shared/ui';
import { Animation } from '@renderer/shared/ui/Animation/Animation';
import { VariantAnimationProps } from './common/constants';
import { Variant } from './common/types';

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
}: PropsWithChildren<Props>) => {
  return (
    <StatusModal
      content={<Animation variant={variant} {...VariantAnimationProps[variant]} />}
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      {children}
    </StatusModal>
  );
};
