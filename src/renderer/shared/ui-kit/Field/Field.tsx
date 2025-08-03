import { type PropsWithChildren } from 'react';

type Props = {
  text: string;
};

export const Field = ({ text, children }: PropsWithChildren<Props>) => {
  return (
    <label className="flex w-full flex-col gap-y-2">
      <span className="text-footnote text-text-tertiary font-medium">{text}</span>
      {children}
    </label>
  );
};
