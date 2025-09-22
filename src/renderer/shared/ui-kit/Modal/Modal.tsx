import * as Dialog from '@radix-ui/react-dialog';
import { isObject } from 'lodash';
import { Children, type PropsWithChildren, type ReactNode } from 'react';

import { cnTw, nonNullable } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui/Buttons/IconButton/IconButton';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { useTheme } from '../Theme/useTheme';

import './Modal.css';

type Props = {
  isOpen?: boolean;
  size: 'sm' | 'md' | 'mdlg' | 'lg' | 'xl' | 'xxl' | 'full' | 'fit';
  height?: 'full' | 'lg' | 'fit';
  testId?: string;
  onToggle?: (open: boolean) => void;
};

const Root = ({
  isOpen,
  size = 'md',
  height = 'fit',
  children,
  onToggle,
  testId = 'Modal',
}: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();

  const arrayChildren = Children.toArray(children);
  const triggerNode = arrayChildren.find(child => {
    return nonNullable(child) && isObject(child) && 'type' in child && child.type === Trigger;
  });
  const modalNodes = triggerNode ? arrayChildren.filter(child => child !== triggerNode) : arrayChildren;

  const hasTitle =
    modalNodes.find(child => {
      return nonNullable(child) && isObject(child) && 'type' in child && child.type === Title;
    }) !== null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onToggle}>
      {triggerNode}
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay
          className={cnTw(
            'absolute inset-0 z-50 flex min-h-full items-center justify-center overflow-hidden p-4',
            'bg-dim-background',
            'duration-300 animate-in fade-in',
          )}
        >
          <Dialog.Content
            aria-describedby={undefined}
            data-testid={testId}
            className={cnTw(
              'ui-kit-modal-height flex max-w-full min-w-32 flex-col overflow-hidden',
              'text-left align-middle text-body',
              'transform rounded-lg bg-white shadow-modal transition-transform',
              'duration-200 animate-in fade-in zoom-in-95',
              {
                'w-modal-sm': size === 'sm',
                'w-modal': size === 'md',
                'w-148': size === 'mdlg',
                'w-modal-lg': size === 'lg',
                'w-modal-xl': size === 'xl',
                'w-full': size === 'full',
                'w-fit': size === 'fit',
                'h-fit': height === 'fit',
                'h-full': height === 'full',
                'h-modal': height === 'lg',
              },
            )}
          >
            {hasTitle ? null : <Dialog.Title hidden />}
            {modalNodes}
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
      <header className="flex w-full items-center justify-between py-3 ps-5 pe-3 contain-inline-size">
        <h1 className="truncate py-1 font-manrope text-header-title font-bold text-text-primary">{children}</h1>

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

const HeaderContent = ({ children }: PropsWithChildren) => {
  return (
    <header aria-level={2} className="shrink-0">
      {children}
    </header>
  );
};

const Content = ({ disableScroll, children }: PropsWithChildren<{ disableScroll?: boolean }>) => {
  return disableScroll ? (
    <div className="flex h-full min-h-0 grow flex-col overflow-hidden">{children}</div>
  ) : (
    <ScrollArea>{children}</ScrollArea>
  );
};

const Trigger = ({ disabled, children }: PropsWithChildren<{ disabled?: boolean }>) => {
  return (
    <Dialog.Trigger disabled={disabled} asChild>
      {children}
    </Dialog.Trigger>
  );
};

const Footer = ({ children, align = 'end' }: PropsWithChildren<{ align?: 'start' | 'end' | 'between' }>) => {
  return (
    <footer
      className={cnTw('flex h-fit items-center gap-2 px-5 pt-3 pb-4', {
        'justify-end': align === 'end',
        'justify-start': align === 'start',
        'justify-between': align === 'between',
      })}
    >
      {children}
    </footer>
  );
};

export const Modal = Object.assign(Root, {
  Trigger,
  Title,
  HeaderContent,
  Content,
  Footer,
});
