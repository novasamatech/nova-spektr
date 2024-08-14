import { type DelegateAccount } from '@/shared/api/governance';
import { Markdown } from '@/shared/ui';
import { DelegateBadge, DelegateIcon, DelegateTitle } from '@/features/governance';

type Props = {
  delegate: DelegateAccount;
};

export const DelegateInfo = ({ delegate }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <DelegateIcon delegate={delegate} />

        <div className="flex items-center gap-2.5">
          <DelegateTitle delegate={delegate} />
          <DelegateBadge delegate={delegate} />
        </div>
      </div>

      {delegate.longDescription && <Markdown>{delegate.longDescription}</Markdown>}
    </div>
  );
};
