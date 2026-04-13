import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox, Field } from '@/shared/ui-kit';
import { builderModel } from '../model/builder';

export const PalletSelect = memo(() => {
  const { t } = useI18n();
  const palletOptions = useUnit(builderModel.$palletOptions);
  const selectedPallet = useUnit(builderModel.$pallet);
  const palletChanged = useUnit(builderModel.palletChanged);

  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!isEditing || !inputText) return palletOptions;
    const lower = inputText.toLowerCase();

    return palletOptions.filter((name) => name.toLowerCase().includes(lower));
  }, [palletOptions, inputText, isEditing]);

  const displayValue = isEditing ? inputText : (selectedPallet ?? '');

  const handleChange = useCallback(
    (value: string) => {
      if (palletOptions.includes(value)) {
        palletChanged(value);
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(value);
      }
    },
    [palletOptions, palletChanged],
  );

  const handleInput = useCallback((value: string) => {
    setIsEditing(true);
    setInputText(value);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setInputText('');
  }, []);

  return (
    <Field text={t('extrinsicBuilder.pallet')}>
      <Combobox
        placeholder={t('extrinsicBuilder.palletPlaceholder')}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
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
