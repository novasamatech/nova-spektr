import { type DelegateAccount } from '@/shared/api/governance';
import { Markdown } from '@/shared/ui';
import { DelegateName } from '@/features/governance';

type Props = {
  delegate: DelegateAccount;
};

export const DelegateDescription = ({ delegate }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <DelegateName delegate={delegate} titleClassName="max-w-[430px]" />

      {delegate.longDescription && <Markdown>{delegate.longDescription}</Markdown>}
    </div>
  );
};
