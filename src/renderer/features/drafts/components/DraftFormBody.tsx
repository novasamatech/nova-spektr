import { type Store } from 'effector';
import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';

type Props = {
  $isDraftMode: Store<boolean>;
  $isDraftPathComplete: Store<boolean>;
};

export const DraftFormBody = ({ $isDraftMode, $isDraftPathComplete, children }: PropsWithChildren<Props>) => {
  const isDraftMode = useUnit($isDraftMode);
  const isComplete = useUnit($isDraftPathComplete);
  const hidden = isDraftMode && !isComplete;

  return (
    <div
      aria-hidden={hidden}
      className={cnTw(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        hidden ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
      )}
    >
      <div
        className={cnTw(
          'overflow-hidden transition-[opacity,transform] duration-300 ease-out',
          hidden ? 'pointer-events-none translate-y-4 opacity-0' : 'translate-y-0 opacity-100',
        )}
      >
        {children}
      </div>
    </div>
  );
};
