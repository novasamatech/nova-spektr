import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

import Icon from '../../Icon/Icon';

type Props = {
  path?: string;
  onCustomReturn?: () => void;
};

const ButtonBack = ({ path, children, onCustomReturn }: PropsWithChildren<Props>) => {
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
    <button type="button" className="group flex items-center gap-x-2.5" onClick={onClick}>
      <Icon
        className="text-neutral-variant transition-colors group-hover:text-neutral group-focus:text-neutral"
        name="arrowLeftCutout"
      />
      {children}
    </button>
  );
};

export default ButtonBack;
