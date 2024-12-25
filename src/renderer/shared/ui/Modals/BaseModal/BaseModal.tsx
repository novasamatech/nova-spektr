import * as Dialog from '@radix-ui/react-dialog';
import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { useTheme } from '@/shared/ui-kit/Theme/useTheme';
import { IconButton } from '../../Buttons';
import { HeaderTitleText } from '../../Typography';

type Props = {
  isOpen: boolean;
  title?: ReactNode;
  zIndex?: string;
  contentClass?: string;
  headerClass?: string;
  panelClass?: string;
  panelStyle?: object;
  closeButton?: boolean;
  actionButton?: ReactNode;
  onClose: () => void;
  testId?: string;
};

/**
 * @deprecated Use `import { Modal } from '@/shared/ui-kit'`
 */
export const BaseModal = ({
  isOpen,
  title,
  zIndex = 'z-50',
  contentClass = 'pb-4 px-5',
  headerClass = 'pl-5 pr-3 pt-3',
  actionButton,
  closeButton,
  panelClass,
  children,
  panelStyle,
  onClose,
  testId = 'BaseModal',
}: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();
  const headerExist = title || actionButton || closeButton;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay
          className={cnTw(
            'absolute inset-0 flex min-h-full items-center justify-center overflow-hidden p-4',
            'bg-dim-background',
            'duration-300 animate-in fade-in',
            zIndex,
          )}
        >
          <Dialog.Content
            style={panelStyle}
            className={cnTw(
              'w-modal max-w-full transform rounded-lg bg-white text-left align-middle shadow-modal transition-all',
              'duration-300 animate-in fade-in zoom-in-95',
              panelClass,
            )}
            data-testid={testId}
          >
            {headerExist && (
              <Dialog.Title asChild>
                <header className={cnTw('flex w-full items-center justify-between contain-inline-size', headerClass)}>
                  {title && typeof title === 'string' && (
                    <HeaderTitleText className="truncate py-1 font-bold text-text-primary">{title}</HeaderTitleText>
                  )}

                  {title && typeof title !== 'string' && title}

                  <div className="z-20 flex h-7.5 items-center gap-x-4">
                    {actionButton}

                    {closeButton && (
                      <Dialog.Close asChild>
                        <IconButton name="close" size={20} className="m-1" />
                      </Dialog.Close>
                    )}
                  </div>
                </header>
              </Dialog.Title>
            )}
            <Dialog.Description asChild>
              <section className={contentClass}>{children}</section>
            </Dialog.Description>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
