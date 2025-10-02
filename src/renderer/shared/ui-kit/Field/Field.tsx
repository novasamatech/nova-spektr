import { type PropsWithChildren } from 'react';

type Props = {
  text: string;
  testId?: string;
};

export const Field = ({ text, testId, children }: PropsWithChildren<Props>) => {
  return (
    <label className="flex w-full flex-col gap-y-2" data-testid={testId}>
      <span className="text-footnote font-medium text-text-tertiary">{text}</span>
      {children}
    </label>
  );
};
