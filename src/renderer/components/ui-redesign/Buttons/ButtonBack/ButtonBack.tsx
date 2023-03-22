import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

import Icon from '../../../ui/Icon/Icon';

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

  return (
    <button
      type="button"
      className="group flex items-center gap-x-2.5 p-1 border rounded border-gray-border"
      onClick={onClick}
    >
      <Icon size={16} className="text-shade" name="arrowLeft" />
    </button>
  );
};

export default ButtonBack;
