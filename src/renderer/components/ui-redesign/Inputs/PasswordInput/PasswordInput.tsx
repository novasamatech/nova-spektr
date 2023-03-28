import { forwardRef } from 'react';

import Input, { Props as InputProps } from '../Input/Input';
import Icon from '@renderer/components/ui/Icon/Icon';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';

type Props = Omit<InputProps, 'type' | 'suffixElement'>;

const PasswordInput = forwardRef<HTMLInputElement, Props>(({ ...props }, ref) => {
  const { t } = useI18n();
  const [isHidden, toggleVisibility] = useToggle(true);

  return (
    <Input
      type={isHidden ? 'password' : 'text'}
      label={t('settings.matrix.passwordLabel')}
      placeholder={t('settings.matrix.passwordPlaceholder')}
      suffixElement={
        <button className="absolute mt-1.5 mr-2.5 right-0 text-redesign-icon-gray" onClick={toggleVisibility}>
          <Icon name={isHidden ? 'eyeSlashed' : 'eye'} size={20} alt={t('settings.matrix.passwordVisibilityButton')} />
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
