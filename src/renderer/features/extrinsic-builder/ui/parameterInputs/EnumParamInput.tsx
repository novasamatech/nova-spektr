import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox } from '@/shared/ui-kit';
import { type ParameterTypeDef } from '../../lib/types';
import { ParameterField } from '../ParameterField';

type EnumValue = {
  variant: string;
  values: Record<string, unknown>;
};

type Props = {
  typeDef: ParameterTypeDef;
  value: EnumValue;
  onChange: (value: EnumValue) => void;
  depth: number;
};

export const EnumParamInput = memo(({ typeDef, value, onChange, depth }: Props) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const variants = typeDef.variants ?? [];
  const variantNames = useMemo(() => variants.map((v) => v.name), [variants]);

  const filteredVariants = useMemo(() => {
    if (!isEditing || !inputText) return variants;
    const lower = inputText.toLowerCase();

    return variants.filter((v) => v.name.toLowerCase().includes(lower));
  }, [variants, inputText, isEditing]);

  const selectedVariant = useMemo(() => variants.find((v) => v.name === value.variant), [variants, value.variant]);

  const displayValue = isEditing ? inputText : value.variant;

  const handleChange = useCallback(
    (variantName: string) => {
      if (variantNames.includes(variantName)) {
        onChange({ variant: variantName, values: {} });
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(variantName);
      }
    },
    [variantNames, onChange],
  );

  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      onChange({
        ...value,
        values: { ...value.values, [fieldName]: fieldValue },
      });
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-col gap-y-2">
      <Combobox
        placeholder={t('extrinsicBuilder.enumPlaceholder')}
        value={displayValue}
        onBlur={() => {
          setIsEditing(false);
          setInputText('');
        }}
        onChange={handleChange}
        onInput={(v) => {
          setIsEditing(true);
          setInputText(v);
        }}
      >
        {filteredVariants.map((v) => (
          <Combobox.Item key={v.name} value={v.name}>
            {v.name}
          </Combobox.Item>
        ))}
      </Combobox>

      {selectedVariant && selectedVariant.fields.length > 0 && (
        <div className="border-border-default flex flex-col gap-y-2 border-l-2 pl-3">
          {selectedVariant.fields.map((field) => (
            <ParameterField
              key={field.name}
              name={field.name}
              typeDef={field.typeDef}
              value={value.values[field.name]}
              depth={depth}
              onChange={(val) => handleFieldChange(field.name, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
