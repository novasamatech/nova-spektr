import { useToggle } from '@renderer/shared/lib/hooks';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

export const AssetIcon = ({ src, name, size = 32, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useToggle();

  return (
    <div
      className={cnTw(
        'relative rounded-full bg-token-background border border-token-border p-[1px] min-w-fit',
        className,
      )}
    >
      <img
        src={src}
        className={cnTw('transition-opacity', !isImgLoaded && 'opacity-0')}
        style={{ width: size, height: size }} // using width and height attr doesn't work properly for invisible img. It gets reset by tailwind @base styles
        alt={name}
        onLoad={toggleImgLoaded}
      />
    </div>
  );
};
