import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconButton } from '../IconButton/IconButton';

type Props = {
  path?: string;
  onCustomReturn?: () => void;
};

const ButtonBack = ({ path, onCustomReturn }: PropsWithChildren<Props>) => {
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

  return <IconButton name="arrowLeft" onClick={onClick} />;
};

export default ButtonBack;
