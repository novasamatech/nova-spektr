import * as Dialog from '@radix-ui/react-dialog';
import { type PropsWithChildren, type ReactNode } from 'react';

import { HeaderTitleText, IconButton } from '@/shared/ui';
import { cnTw, nonNullable } from '@shared/lib/utils';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { useTheme } from '../Theme/useTheme';

type Props = {
  isOpen: boolean;
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fit';
  onToggle: (open: boolean) => void;
};

const Root = ({ isOpen, size = 'md', children, onToggle }: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onToggle}>
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay
          className={cnTw(
            'fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-hidden p-4',
            'bg-dim-background',
            'duration-300 animate-in fade-in',
          )}
        >
          <Dialog.Content
            className={cnTw(
              'flex max-h-[95%] min-w-32 max-w-[95%] transform flex-col rounded-lg bg-white text-left align-middle shadow-modal transition-all',
              'duration-200 animate-in fade-in zoom-in-95',
              {
                'w-modal-sm': size === 'sm',
                'w-modal': size === 'md',
                'w-modal-lg': size === 'lg',
                'w-modal-xl': size === 'xl',
                'w-full': size === 'full',
                'w-fit': size === 'fit',
              },
            )}
          >
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

type TitleProps = PropsWithChildren<{
  action?: ReactNode;
  close?: boolean;
}>;

const Title = ({ action, close, children }: TitleProps) => {
  const headerExist = nonNullable(children) || nonNullable(action) || nonNullable(close);

  return (
    <Dialog.Title asChild hidden={!headerExist} className={!headerExist ? 'hidden' : ''}>
      <header className="flex w-full items-center justify-between py-3 pe-3 ps-5 contain-inline-size">
        <HeaderTitleText className="truncate py-1 font-bold text-text-primary">{children}</HeaderTitleText>

        <div className="z-20 flex h-7.5 items-center gap-x-4">
          {action}

          {close && (
            <Dialog.Close asChild>
              <IconButton name="close" size={20} className="m-1" />
            </Dialog.Close>
          )}
        </div>
      </header>
    </Dialog.Title>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  return (
    <Dialog.Description asChild>
      <ScrollArea>
        <section>{children}</section>
      </ScrollArea>
    </Dialog.Description>
  );
};

const Footer = ({ children }: PropsWithChildren) => {
  return <footer className="flex h-fit items-end justify-end px-5 pb-4 pt-3">{children}</footer>;
};

export const Modal = Object.assign(Root, {
  Title,
  Content,
  Footer,
});
