import { FootnoteText, Shimmering } from '@/shared/ui';

type Props = {
  count: number;
  loading: boolean;
};

export const VoteCount = ({ count, loading }: Props) => {
  if (loading) {
    return <Shimmering height="1em" width="1ch" />;
  }

  return (
    <FootnoteText as="span" className="text-text-tertiary">
      {count.toString()}
    </FootnoteText>
  );
};
