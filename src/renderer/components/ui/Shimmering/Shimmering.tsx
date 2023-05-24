import cn from 'classnames';

import './Shimmering.css';

type Props = {
  width?: number;
  height?: number;
  circle?: boolean;
  className?: string;
};

const Shimmering = ({ width, height, circle, className }: Props) => (
  <span
    className={cn('h-full w-full spektr-shimmer', circle ? 'rounded-full' : 'rounded-[10px]', className)}
    style={{ width: `${width}px`, height: `${circle ? width : height}px` }}
    data-testid="shimmer"
  />
);

export default Shimmering;
