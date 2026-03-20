import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';

type Props = {
  count: number;
  loading: boolean;
};

export const VoteCount = ({ count, loading }: Props) => {
  if (loading) {
    return <Skeleton height="1em" width="1ch" />;
  }

  return (
    <FootnoteText as="span" className="text-text-tertiary">
      {count.toString()}
    </FootnoteText>
  );
};
