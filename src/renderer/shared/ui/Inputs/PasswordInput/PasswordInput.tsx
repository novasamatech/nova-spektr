import { forwardRef } from 'react';

import { useI18n } from '@app/providers';

import { useToggle } from '@shared/lib/hooks';

import { Icon } from '../../Icon/Icon';
import { Input, type Props as InputProps } from '../Input/Input';

type Props = Omit<InputProps, 'type' | 'suffixElement'>;

// TODO: Use label, placeholder and alt from props not static values
export const PasswordInput = forwardRef<HTMLInputElement, Props>(({ ...props }, ref) => {
  const { t } = useI18n();
  const [isHidden, toggleVisibility] = useToggle(true);

  return (
    <Input
      ref={ref}
      type={isHidden ? 'password' : 'text'}
      label={t('general.passwordInput.passwordLabel')}
      placeholder={t('general.passwordInput.passwordPlaceholder')}
      suffixElement={
        <button type="button" className="ml-2" onClick={toggleVisibility}>
          <Icon
            name={isHidden ? 'eyeSlashed' : 'eye'}
            size={20}
            alt={t('general.passwordInput.passwordVisibilityButton')}
          />
        </button>
      }
      {...props}
      spellCheck="false"
    />
  );
});
