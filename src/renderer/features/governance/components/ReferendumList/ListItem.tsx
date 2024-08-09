import { type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  onClick: VoidFunction;
}>;

export const ListItem = ({ children, onClick }: Props) => {
  return (
    <button type="button" className="flex w-full flex-col gap-y-3 rounded-md bg-white p-3" onClick={onClick}>
      {children}
    </button>
  );
};
