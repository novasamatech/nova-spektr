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
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fit';
  height?: 'full' | 'fit';
  onToggle?: (open: boolean) => void;
};

const Root = ({ isOpen, size = 'md', height = 'fit', children, onToggle }: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();

  const arrayChildren = Children.toArray(children);
  const triggerNode = arrayChildren.find((child) => {
    return nonNullable(child) && isObject(child) && 'type' in child && child.type === Trigger;
  });
  const modalNodes = triggerNode ? arrayChildren.filter((child) => child !== triggerNode) : arrayChildren;

  const hasTitle =
    modalNodes.find((child) => {
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
            className={cnTw(
              'ui-kit-modal-height flex min-w-32 max-w-full flex-col overflow-hidden',
              'text-left align-middle text-body',
              'transform rounded-lg bg-white shadow-modal transition-transform',
              'duration-200 animate-in fade-in zoom-in-95',
              {
                'w-modal-sm': size === 'sm',
                'w-modal': size === 'md',
                'w-modal-lg': size === 'lg',
                'w-modal-xl': size === 'xl',
                'w-full': size === 'full',
                'w-fit': size === 'fit',
                'h-fit': height === 'fit',
                'h-full': height === 'full',
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
      <header className="flex w-full items-center justify-between py-3 pe-3 ps-5 contain-inline-size">
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

const Content = ({ disableScroll, children }: PropsWithChildren<{ disableScroll?: boolean }>) => {
  return disableScroll ? (
    <div className="h-full flex-grow overflow-hidden">{children}</div>
  ) : (
    <ScrollArea>{children}</ScrollArea>
  );
};

const Trigger = ({ children }: PropsWithChildren) => {
  return <Dialog.Trigger asChild>{children}</Dialog.Trigger>;
};

const Footer = ({ children }: PropsWithChildren) => {
  return <footer className="flex h-fit items-end justify-end gap-2 px-5 pb-4 pt-3">{children}</footer>;
};

export const Modal = Object.assign(Root, {
  Trigger,
  Title,
  Content,
  Footer,
});
