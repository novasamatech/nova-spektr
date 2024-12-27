import * as Dialog from '@radix-ui/react-dialog';
import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '../../Typography';
import { BaseModal } from '../BaseModal/BaseModal';

type Props = {
  content?: ReactNode;
  title: string;
  description?: string;
  isOpen: boolean;
  zIndex?: string;
  onClose: () => void;
  className?: string;
  testId?: string;
};

export const StatusModal = ({
  title,
  description,
  isOpen,
  zIndex = 'z-50',
  content,
  className,
  children,
  onClose,
  testId = 'StatusModal',
}: PropsWithChildren<Props>) => {
  return (
    <BaseModal
      isOpen={isOpen}
      zIndex={zIndex}
      panelClass={cnTw(
        'flex w-[240px] max-w-md transform flex-col items-center justify-center rounded-lg align-middle',
        'bg-white p-4 shadow-card-shadow transition-all',
        className,
      )}
      contentClass="p-0 flex flex-col items-center"
      testId={testId}
      onClose={onClose}
    >
      {content}
      <Dialog.Title asChild>
        <SmallTitleText className="mb-2 font-semibold" align="center">
          {title}
        </SmallTitleText>
      </Dialog.Title>

      {description && (
        <FootnoteText className="text-text-tertiary" align="center">
          {description}
        </FootnoteText>
      )}

      {children && <div className="mt-3 flex gap-x-3">{children}</div>}
    </BaseModal>
  );
};
