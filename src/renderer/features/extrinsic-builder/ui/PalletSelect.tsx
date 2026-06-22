import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox, Field } from '@/shared/ui-kit';
import { useComboboxFilter } from '../hooks/useComboboxFilter';

type Props = {
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
};

export const PalletSelect = memo(({ options, value, onChange }: Props) => {
  const { t } = useI18n();
  const { filteredOptions, displayValue, handleChange, handleBlur, handleInput } = useComboboxFilter(
    options,
    value,
    onChange,
  );

  return (
    <Field text={t('extrinsicBuilder.pallet')} clickableLabel={false}>
      <Combobox
        placeholder={t('extrinsicBuilder.palletPlaceholder')}
        value={displayValue}
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
