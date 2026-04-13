import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox, Field } from '@/shared/ui-kit';
import { useComboboxFilter } from '../hooks/useComboboxFilter';

type Props = {
  options: string[];
  value: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

export const CallSelect = memo(({ options, value, disabled, onChange }: Props) => {
  const { t } = useI18n();
  const { filteredOptions, displayValue, handleChange, handleBlur, handleInput } = useComboboxFilter(
    options,
    value,
    onChange,
  );

  return (
    <Field text={t('extrinsicBuilder.call')}>
      <Combobox
        placeholder={t('extrinsicBuilder.callPlaceholder')}
        value={displayValue}
        disabled={disabled}
        onBlur={handleBlur}
        onChange={handleChange}
        onInput={handleInput}
      >
        {filteredOptions.map((name) => (
          <Combobox.Item key={name} value={name}>
            {name}
          </Combobox.Item>
        ))}
      </Combobox>
    </Field>
  );
});
