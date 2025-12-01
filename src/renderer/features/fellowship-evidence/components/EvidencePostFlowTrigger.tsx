import { Slot } from '@radix-ui/react-slot';
import { type HTMLAttributes, type MouseEvent, type ReactElement, memo, useCallback } from 'react';

import { evidenceForm } from '../model/evidenceForm';
import { evidencePost } from '../model/evidencePost';

type RadixIntegration = Pick<
  HTMLAttributes<Element>,
  | 'onClick'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onPointerMove'
  | 'onPointerLeave'
>;

type Props = RadixIntegration & {
  wish: 'Promotion' | 'Retention';
  children: ReactElement;
};

export const EvidencePostFlowTrigger = memo(({ wish, children, ...radix }: Props) => {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      evidenceForm.setFlowType('fromScratch');
      evidencePost.setActiveWish(wish);
      evidencePost.setStep('form');
      evidenceForm.flow.open({ wish });
      radix.onClick?.(e);
    },
    [wish],
  );

  return (
    <Slot {...radix} onClick={handleClick}>
      {children}
    </Slot>
  );
});
