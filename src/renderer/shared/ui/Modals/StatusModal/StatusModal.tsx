import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { FootnoteText, SmallTitleText } from '../../Typography';

type Props = {
  content?: ReactNode;
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  testId?: string;
};

export const StatusModal = ({
  title,
  description,
  isOpen,
  content,
  className,
  children,
  onClose,
  testId = 'StatusModal',
}: PropsWithChildren<Props>) => {
  return (
    <Modal size="fit" isOpen={isOpen} testId={testId} onToggle={(open) => !open && onClose()}>
      <Modal.Content>
        <div className={cnTw('flex w-[240px] flex-col items-center justify-center p-4', className)}>
          {content}
          <SmallTitleText className="mb-2 font-semibold" align="center">
            {title}
          </SmallTitleText>

          {description && (
            <FootnoteText className="text-text-tertiary" align="center">
              {description}
            </FootnoteText>
          )}

          {children && <div className="mt-3 flex w-full justify-center gap-x-3">{children}</div>}
        </div>
      </Modal.Content>
    </Modal>
  );
};
