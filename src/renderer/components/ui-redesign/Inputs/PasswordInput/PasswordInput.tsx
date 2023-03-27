import { forwardRef, useState } from 'react';

import Input, { Props as InputProps } from '../Input/Input';
import Icon from '@renderer/components/ui/Icon/Icon';

type Props = Omit<InputProps, 'type' | 'suffixElement'>;

const PasswordInput = forwardRef<HTMLInputElement, Props>(({ label = 'Password', ...props }, ref) => {
  const [hidePassword, setHidePassword] = useState(true);

  return (
    <Input
      type={hidePassword ? 'password' : 'text'}
      label={label}
      suffixElement={
        <button
          className="absolute mt-1.5 mr-2.5 right-0 text-redesign-icon-gray"
          onClick={() => setHidePassword(!hidePassword)}
        >
          <Icon name={hidePassword ? 'eyeSlashed' : 'eye'} size={20} alt="Show password" />
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
