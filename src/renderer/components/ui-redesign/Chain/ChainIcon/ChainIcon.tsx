import { useToggle } from '@renderer/shared/hooks';
import { Shimmering } from '@renderer/components/ui';

type Props = {
  icon?: string;
  name?: string;
  size?: number;
};

export const ChainIcon = ({ icon, name, size = 16 }: Props) => {
  const [imgLoadError, toggleImgLoadError] = useToggle();

  return imgLoadError ? (
    <Shimmering width={size} height={size} className="rounded" />
  ) : (
    <img src={icon} className="inline-block" width={size} height={size} alt={name} onError={toggleImgLoadError} />
  );
};
