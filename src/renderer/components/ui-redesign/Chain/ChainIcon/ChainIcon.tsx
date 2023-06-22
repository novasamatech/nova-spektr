import { useToggle } from '@renderer/shared/hooks';
import { Shimmering } from '@renderer/components/ui';

type Props = {
  icon?: string;
  name?: string;
  size?: number;
};

export const ChainIcon = ({ icon, name, size = 16 }: Props) => {
  const [imgLoadError, toggleImgLoadError] = useToggle();

  return !imgLoadError ? (
    <img
      className="inline-block"
      width={size}
      height={size}
      alt={name}
      src={icon}
      onError={() => toggleImgLoadError()}
    />
  ) : (
    <Shimmering width={size} height={size} />
  );
};
