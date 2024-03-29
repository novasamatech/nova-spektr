import { CaptionText } from '../Typography';
import { cnTw } from '../../lib/utils';
import './Separator.css';

type Props = {
  text?: string;
  className?: string;
};

export const Separator = ({ text, className }: Props) => {
  return (
    <div className={cnTw('flex items-center w-full spektr-separator', className)}>
      <CaptionText className="text-text-tertiary uppercase mx-4" align="center">
        {text}
      </CaptionText>
    </div>
  );
};
