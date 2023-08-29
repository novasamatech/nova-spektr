import { useToggle } from '@renderer/shared/lib/hooks';
import { cnTw } from '@renderer/shared/lib/utils';
import './styles.css';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
};

export const AssetIcon = ({ src, name, size = 28, className }: Props) => {
  const [isImgLoaded, toggleImgLoaded] = useToggle();

  return (
    <div className={cnTw('relative rounded-full token-container p-[1px] min-w-fit', className)}>
      <img
        src={src}
        className={cnTw('transition-opacity box-content rounded-full bg-bg-shade p-[1px]', !isImgLoaded && 'opacity-0')}
        style={{ width: size, height: size }} // using width and height attr doesn't work properly for invisible img. It gets reset by tailwind @base styles
        alt={name}
        onLoad={toggleImgLoaded}
      />
    </div>
  );
};
