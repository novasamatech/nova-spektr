import { type DelegateAccount } from '@/shared/api/governance';

import { DelegateBadge } from './DelegateBadge';
import { DelegateIcon } from './DelegateIcon';
import { DelegateTitle } from './DelegateTitle';

type Props = {
  delegate: DelegateAccount;
  titleClassName?: string;
};

export const DelegateName = ({ delegate, titleClassName }: Props) => {
  return (
    <div className="flex gap-3">
      <DelegateIcon delegate={delegate} />

      <div className="flex w-full flex-1 flex-col">
        <div className="flex w-full grow items-center justify-between gap-2.5">
          <DelegateTitle delegate={delegate} className={titleClassName} />
          <DelegateBadge delegate={delegate} />
        </div>
      </div>
    </div>
  );
};
