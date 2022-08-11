import { useNavigate } from 'react-router-dom';

import { ReactComponent as LeftArrow } from '@images/arrows/left-cutout.svg';

type Props = {
  path?: string;
  onCustomReturn?: () => void;
};

const ButtonReturn = ({ path, onCustomReturn }: Props) => {
  const navigate = useNavigate();

  const onClick = () => {
    if (path) {
      navigate(path, { replace: true });
    } else if (onCustomReturn) {
      onCustomReturn();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      className="text-neutral-variant ease-in transition-colors hover:text-neutral focus:text-neutral"
      onClick={onClick}
    >
      <LeftArrow width={24} height={24} />
    </button>
  );
};

export default ButtonReturn;
