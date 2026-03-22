import { Markdown } from '@/shared/ui-kit/Markdown/Markdown';

type Props = {
  children: string;
  compact?: boolean;
};

export const ReferendumTaskMarkdown = ({ children, compact }: Props) => {
  return (
    <Markdown cut="150px" compact={compact} overrideElements={{ h1: () => null }}>
      {children}
    </Markdown>
  );
};
