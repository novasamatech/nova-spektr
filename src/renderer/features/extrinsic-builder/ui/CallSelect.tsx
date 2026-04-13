import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox, Field } from '@/shared/ui-kit';
import { builderModel } from '../model/builder';

export const CallSelect = memo(() => {
  const { t } = useI18n();
  const callOptions = useUnit(builderModel.$callOptions);
  const selectedCall = useUnit(builderModel.$call);
  const selectedPallet = useUnit(builderModel.$pallet);
  const callChanged = useUnit(builderModel.callChanged);

  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!isEditing || !inputText) return callOptions;
    const lower = inputText.toLowerCase();

    return callOptions.filter((name) => name.toLowerCase().includes(lower));
  }, [callOptions, inputText, isEditing]);

  const displayValue = isEditing ? inputText : (selectedCall ?? '');

  const handleChange = useCallback(
    (value: string) => {
      if (callOptions.includes(value)) {
        callChanged(value);
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(value);
      }
    },
    [callOptions, callChanged],
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
    <Field text={t('extrinsicBuilder.call')}>
      <Combobox
        placeholder={t('extrinsicBuilder.callPlaceholder')}
        value={displayValue}
        disabled={!selectedPallet}
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
