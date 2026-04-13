import { type ApiPromise } from '@polkadot/api';
import { memo, useCallback, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Combobox } from '@/shared/ui-kit';
import { useComboboxFilter } from '../../hooks/useComboboxFilter';
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
  api: ApiPromise | null;
};

export const EnumParamInput = memo(({ typeDef, value, onChange, depth, api }: Props) => {
  const { t } = useI18n();

  const variants = typeDef.variants ?? [];
  const variantNames = useMemo(() => variants.map((v) => v.name), [variants]);
  const selectedVariant = useMemo(() => variants.find((v) => v.name === value.variant), [variants, value.variant]);

  const handleVariantChange = useCallback(
    (variantName: string) => {
      onChange({ variant: variantName, values: {} });
    },
    [onChange],
  );

  const {
    filteredOptions: filteredVariants,
    displayValue,
    handleChange,
    handleBlur,
    handleInput,
  } = useComboboxFilter(variantNames, value.variant, handleVariantChange);

  const filteredVariantDefs = useMemo(() => {
    const filtered = new Set(filteredVariants);

    return variants.filter((v) => filtered.has(v.name));
  }, [variants, filteredVariants]);

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
        onBlur={handleBlur}
        onChange={handleChange}
        onInput={handleInput}
      >
        {filteredVariantDefs.map((v) => (
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
              depth={depth + 1}
              api={api}
              onChange={(val) => handleFieldChange(field.name, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
