import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { isObject } from 'lodash';
import { Children, type PropsWithChildren } from 'react';

import { cnTw, nonNullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';
import { useTheme } from '../Theme/useTheme';

type Props = {
  title: string;
  cancelText: string;
  confirmText: string;
  type?: 'alert' | 'warning';
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
};

const Root = ({
  title,
  cancelText,
  confirmText,
  type = 'alert',
  children,
  isOpen,
  onToggle,
  onCancel,
  onConfirm,
}: PropsWithChildren<Props>) => {
  const { portalContainer } = useTheme();

  const arrayChildren = Children.toArray(children);
  const triggerNode = arrayChildren.find(child => {
    return nonNullable(child) && isObject(child) && 'type' in child && child.type === Trigger;
  });
  const contentNode = arrayChildren.find(child => {
    return nonNullable(child) && isObject(child) && 'type' in child && child.type === Content;
  });

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={onToggle}>
      {triggerNode}
      <AlertDialog.Portal container={portalContainer}>
        <AlertDialog.Overlay
          className={cnTw(
            'absolute inset-0 z-50 flex min-h-full items-center justify-center overflow-hidden p-4',
            'bg-dim-background',
            'duration-300 animate-in fade-in',
          )}
        >
          <AlertDialog.Content
            className={cnTw(
              'flex w-60 flex-col overflow-hidden p-4',
              'text-center align-middle text-body',
              'transform rounded-lg bg-white shadow-modal transition-transform',
              'duration-200 animate-in fade-in zoom-in-95',
            )}
          >
            <AlertDialog.Title className="font-manrope text-small-title">{title}</AlertDialog.Title>
            {contentNode}
            <Box horizontalAlign="center" direction="row" gap={3} padding={[4, 0, 0]}>
              <AlertDialog.Cancel asChild>
                <Button className="flex-1" size="sm" variant="fill" pallet="secondary" onClick={onCancel}>
                  {cancelText}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  className="flex-1"
                  size="sm"
                  variant="fill"
                  pallet={type === 'warning' ? 'error' : 'primary'}
                  onClick={onConfirm}
                >
                  {confirmText}
                </Button>
              </AlertDialog.Action>
            </Box>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

const Content = ({ children }: PropsWithChildren) => {
  return <AlertDialog.Description className="mt-2 text-text-tertiary">{children}</AlertDialog.Description>;
};

const Trigger = ({ disabled, children }: PropsWithChildren<{ disabled?: boolean }>) => {
  return (
    <AlertDialog.Trigger disabled={disabled} asChild>
      {children}
    </AlertDialog.Trigger>
  );
};

export const ConfirmModal = Object.assign(Root, {
  Content,
  Trigger,
});
