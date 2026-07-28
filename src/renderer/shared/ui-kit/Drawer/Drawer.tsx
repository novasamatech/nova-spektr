import * as Dialog from '@radix-ui/react-dialog';
import { isObject } from 'lodash';
import { type PropsWithChildren, type ReactNode, Children, createContext, useContext, useState } from 'react';

import { cnTw, nonNullable } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui/Buttons/IconButton/IconButton';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { useTheme } from '../Theme/useTheme';

const DrawerOverlayContext = createContext<HTMLElement | null>(null);

export const useDrawerOverlay = () => useContext(DrawerOverlayContext);

type Props = {
  isOpen?: boolean;
  /**
   * Panel width in pixels.
   *
   * @default 560
   */
  width?: number;
  testId?: string;
  preventOutsideClick?: boolean;
  onToggle?: (open: boolean) => void;
};

const Root = ({
  isOpen,
  width = 560,
  children,
  onToggle,
  testId = 'Drawer',
  preventOutsideClick = false,
}: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);

  const arrayChildren = Children.toArray(children);
  const triggerNode = arrayChildren.find(child => {
    return nonNullable(child) && isObject(child) && 'type' in child && child.type === Trigger;
  });
  const drawerNodes = triggerNode ? arrayChildren.filter(child => child !== triggerNode) : arrayChildren;

  // `find` returns undefined, never null - comparing against null made this
  // unconditionally true and the a11y fallback title below unreachable.
  const hasTitle = drawerNodes.some(child => {
    return nonNullable(child) && isObject(child) && 'type' in child && child.type === Title;
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onToggle}>
      {triggerNode}
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay
          ref={setOverlay}
          className={cnTw(
            'absolute inset-0 z-50 flex min-h-full justify-end overflow-hidden',
            'bg-dim-background',
            'duration-300 animate-in fade-in',
          )}
        >
          <DrawerOverlayContext.Provider value={overlay}>
            <Dialog.Content
              aria-describedby={undefined}
              data-testid={testId}
              className={cnTw(
                'flex h-full max-w-full min-w-32 flex-col overflow-hidden',
                'text-left align-middle text-body',
                'rounded-l-lg bg-white shadow-modal',
                'duration-300 animate-in slide-in-from-right',
              )}
              style={{ width }}
              onInteractOutside={preventOutsideClick ? e => e.preventDefault() : undefined}
            >
              {hasTitle ? null : <Dialog.Title hidden />}
              {drawerNodes}
            </Dialog.Content>
          </DrawerOverlayContext.Provider>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

type TitleProps = PropsWithChildren<{
  action?: ReactNode;
  close?: boolean;
  gap?: 'none' | 'small' | 'medium' | 'large';
}>;

const Title = ({ action, close, children, gap = 'medium' }: TitleProps) => {
  const headerExist = nonNullable(children) || nonNullable(action) || nonNullable(close);

  return (
    <Dialog.Title asChild hidden={!headerExist} className={!headerExist ? 'hidden' : ''}>
      <header className="flex w-full items-center justify-between py-3 ps-5 pe-3 contain-inline-size">
        <h1 className="w-full truncate py-1 font-manrope text-header-title font-bold text-text-primary">{children}</h1>

        <div
          className={cnTw('z-20 flex h-7.5 items-center', {
            'gap-x-0': gap === 'none',
            'gap-x-2': gap === 'small',
            'gap-x-4': gap === 'medium',
            'gap-x-6': gap === 'large',
          })}
        >
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

type ContentProps = PropsWithChildren<{
  disableScroll?: boolean;
  background?: 'primary' | 'secondary';
}>;

const Content = ({ disableScroll, background = 'primary', children }: ContentProps) => {
  return (
    <div
      className={cnTw('relative flex h-full min-h-0 grow flex-col overflow-hidden', {
        'bg-main-app-background': background === 'secondary',
      })}
    >
      {disableScroll ? children : <ScrollArea>{children}</ScrollArea>}
    </div>
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

export const Drawer = Object.assign(Root, {
  Trigger,
  Title,
  Content,
  Footer,
});
