import { type PropsWithChildren } from 'react';

import { TEST_IDS } from '@/shared/constants';

type Props = PropsWithChildren<{
  onClick: VoidFunction;
}>;

export const ListItem = ({ children, onClick }: Props) => {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer flex-col gap-y-3 rounded-md bg-white p-3"
      data-testid={TEST_IDS.GOVERNANCE.PROPOSAL_ITEM}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
