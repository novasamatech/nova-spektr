import { PropsWithChildren, useEffect, useState } from 'react';

import { StatusModal } from '@renderer/shared/ui';
import { Animation } from '@renderer/shared/ui/Animation/Animation';
import { VariantAnimationProps } from './common/constants';
import { Variant } from './common/types';
import Animations from '@renderer/shared/ui/Animation/Data';

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
  const [animation, setAnimation] = useState();

  useEffect(() => {
    if (isOpen) {
      // using same animation repeatedly without deep clone lead to memory leak
      // https://github.com/airbnb/lottie-web/issues/1159
      setAnimation(JSON.parse(JSON.stringify(Animations[variant])));
    }
  }, [isOpen, variant]);

  return (
    <StatusModal
      content={animation && <Animation animation={animation} {...VariantAnimationProps[variant]} />}
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      {children}
    </StatusModal>
  );
};
