import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';

type Props = {
  displayDate: string;
  first: boolean;
};

export const DateGroupHeader = ({ displayDate, first }: Props) => (
  <div className={cnTw('pb-2 pl-2', first ? 'pt-1' : 'pt-4')}>
    <FootnoteText className="text-text-tertiary">{displayDate}</FootnoteText>
  </div>
);
