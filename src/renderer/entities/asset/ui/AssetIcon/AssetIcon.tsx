import { useToggle } from '@shared/lib/hooks';
import { cnTw } from '@shared/lib/utils';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

// TODO add currency support
export const AssetIcon = ({ src, name, size = 32, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useToggle();

  return (
    <div
      className={cnTw(
        'relative min-w-fit rounded-full border border-token-border bg-token-background p-[1px]',
        className,
      )}
    >
      <img
        src={src}
        className={cnTw('transition-opacity', !isImgLoaded && 'opacity-0')}
        style={{
          width: size,
          height: size,
        }} // using width and height attr doesn't work properly for invisible img. It gets reset by tailwind @base styles
        alt={name}
        onLoad={toggleImgLoaded}
      />
    </div>
  );
};
