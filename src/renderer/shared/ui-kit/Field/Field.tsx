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
  // When an action is provided, it must live OUTSIDE the <label> — otherwise
  // clicking the action chip is forwarded to the wrapped form control (e.g.
  // opens a signatory dropdown when the user only meant to trigger the
  // action). Without an action, keep the original single-label structure so
  // clicking the field text still focuses the control.
  if (action) {
    return (
      <div className="flex w-full flex-col gap-y-2" data-testid={testId}>
        <div className="flex items-center justify-between gap-2 text-footnote font-medium text-text-tertiary">
          <span>{text}</span>
          {action}
        </div>
        <label className="flex flex-col gap-y-2">{children}</label>
      </div>
    );
  }

  return (
    <label className="flex w-full flex-col gap-y-2" data-testid={testId}>
      <span className="text-footnote font-medium text-text-tertiary">{text}</span>
      {children}
    </label>
  );
};
