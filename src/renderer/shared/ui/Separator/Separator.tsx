import { cnTw } from '../../lib/utils';
import { CaptionText } from '../Typography';
import './Separator.css';

type Props = {
  text?: string;
  className?: string;
};

export const Separator = ({ text, className }: Props) => {
  return (
    <div className={cnTw('spektr-separator flex w-full items-center border-divider', className)}>
      <CaptionText className="mx-4 uppercase text-text-tertiary" align="center">
        {text}
      </CaptionText>
    </div>
  );
};
