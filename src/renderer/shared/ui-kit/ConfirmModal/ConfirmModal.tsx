import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { type PropsWithChildren, type ReactNode } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box } from '../Box/Box';
import { useTheme } from '../Theme/useTheme';

type Props = {
  title: string;
  description: ReactNode;
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
  description,
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

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={onToggle}>
      {children}
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
              'transform rounded-lg bg-card-background shadow-modal transition-transform',
              'duration-200 animate-in fade-in zoom-in-95',
            )}
          >
            <AlertDialog.Title className="font-manrope text-small-title">{title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-text-tertiary">
              <Box verticalAlign="center" horizontalAlign="center" gap={2} direction="column">
                {description}
              </Box>
            </AlertDialog.Description>
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

const Trigger = ({ disabled, children }: PropsWithChildren<{ disabled?: boolean }>) => {
  return (
    <AlertDialog.Trigger disabled={disabled} asChild>
      {children}
    </AlertDialog.Trigger>
  );
};

export const ConfirmModal = Object.assign(Root, {
  Trigger,
});
