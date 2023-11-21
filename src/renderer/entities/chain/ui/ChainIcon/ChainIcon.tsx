import { useToggle } from '@shared/lib/hooks';
import { Shimmering } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

export const ChainIcon = ({ src, name, size = 16, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useToggle();

  return (
    <>
      {!isImgLoaded && <Shimmering width={size} height={size} className={cnTw('rounded', className)} />}
      <img
        src={src}
        className={cnTw('inline-block', !isImgLoaded && 'hidden', className)}
        width={size}
        height={size}
        alt={name}
        onLoad={toggleImgLoaded}
      />
    </>
  );
};
