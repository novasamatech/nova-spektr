import { forwardRef } from 'react';

import { Input, Props as InputProps } from '../Input/Input';
import { Icon } from '../../Icon/Icon';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';

type Props = Omit<InputProps, 'type' | 'suffixElement'>;

// TODO: Use label, placeholder and alt from props not static values
export const PasswordInput = forwardRef<HTMLInputElement, Props>(({ ...props }, ref) => {
  const { t } = useI18n();
  const [isHidden, toggleVisibility] = useToggle(true);

  return (
    <Input
      ref={ref}
      type={isHidden ? 'password' : 'text'}
      label={t('settings.matrix.passwordLabel')}
      placeholder={t('settings.matrix.passwordPlaceholder')}
      suffixElement={
        <button type="button" className="ml-2" onClick={toggleVisibility}>
          <Icon name={isHidden ? 'eyeSlashed' : 'eye'} size={20} alt={t('settings.matrix.passwordVisibilityButton')} />
        </button>
      }
      {...props}
      spellCheck="false"
    />
  );
});
