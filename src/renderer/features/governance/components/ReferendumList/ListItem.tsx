import { type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  onClick: VoidFunction;
}>;

export const ListItem = ({ children, onClick }: Props) => {
  return (
    <button type="button" className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white" onClick={onClick}>
      {children}
    </button>
  );
};
