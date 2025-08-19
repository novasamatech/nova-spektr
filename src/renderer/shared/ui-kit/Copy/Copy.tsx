import { type PropsWithChildren, type SyntheticEvent, memo } from 'react';

import { cnTw, copyToClipboard } from '@/shared/lib/utils';

type Props = {
  value: string;
  onCopied?: () => void;
  className?: string;
  testId?: string;
};

export const Copy = memo(({ value, onCopied, children, className, testId = 'Copy' }: PropsWithChildren<Props>) => {
  const onCopyToClipboard = async (e: SyntheticEvent) => {
    e.stopPropagation();
    await copyToClipboard(value);
    onCopied?.();
  };

  return (
    <button
      type="button"
      className={cnTw('m-0 cursor-pointer appearance-none border-0 bg-transparent p-0', className)}
      aria-label="Copy"
      data-testid={testId}
      onClick={onCopyToClipboard}
    >
      {children}
    </button>
  );
});
