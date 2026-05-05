import { type PropsWithChildren, type ReactNode } from 'react';

type Props = {
  text: ReactNode;
  /**
   * Optional content rendered on the right of the field label — typically a
   * small chip or button that controls something related to the field (e.g.
   * opens an editor for the selected value).
   */
  action?: ReactNode;
  testId?: string;
};

export const Field = ({ text, action, testId, children }: PropsWithChildren<Props>) => {
  return (
    <label className="flex w-full flex-col gap-y-2" data-testid={testId}>
      <span className="flex items-center justify-between gap-2 text-footnote font-medium text-text-tertiary">
        <span>{text}</span>
        {action}
      </span>
      {children}
    </label>
  );
};
