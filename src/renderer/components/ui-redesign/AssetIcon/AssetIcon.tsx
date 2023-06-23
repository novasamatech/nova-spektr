import { useToggle } from '@renderer/shared/hooks';
import cnTw from '@renderer/shared/utils/twMerge';

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
        className={cnTw(!isImgLoaded && 'invisible')}
        style={{ width: size, height: size }} // using width and height attr doesn't work properly for invisible img. It gets reset by tailwind @base styles
        alt={name}
        onLoad={toggleImgLoaded}
      />
    </div>
  );
};
