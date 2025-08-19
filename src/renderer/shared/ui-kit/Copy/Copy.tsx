import { type PropsWithChildren, memo } from 'react';

import { cnTw, copyToClipboard } from '@/shared/lib/utils';

type Props = {
  value: string;
  onCopied?: () => void;
  className?: string;
  testId?: string;
};

export const Copy = memo(({ value, onCopied, children, className, testId = 'Copy' }: PropsWithChildren<Props>) => {
  const onCopyToClipboard = async () => {
    await copyToClipboard(value);
    onCopied?.();
  };

  return (
    <span role="button" className={cnTw('cursor-pointer', className)} data-testid={testId} onClick={onCopyToClipboard}>
      {children}
    </span>
  );
});
