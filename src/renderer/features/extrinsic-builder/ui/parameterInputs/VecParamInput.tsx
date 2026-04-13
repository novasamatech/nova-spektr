import { memo, useCallback } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type ParameterTypeDef } from '../../lib/types';
import { ParameterField } from '../ParameterField';

type Props = {
  typeDef: ParameterTypeDef;
  value: unknown[];
  onChange: (value: unknown[]) => void;
  depth: number;
};

export const VecParamInput = memo(({ typeDef, value, onChange, depth }: Props) => {
  const { t } = useI18n();

  const addItem = useCallback(() => {
    onChange([...value, getDefaultValue(typeDef.inner)]);
  }, [value, onChange, typeDef.inner]);

  const removeItem = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const updateItem = useCallback(
    (index: number, newValue: unknown) => {
      const updated = [...value];
      updated[index] = newValue;
      onChange(updated);
    },
    [value, onChange],
  );

  if (!typeDef.inner) {
    return null;
  }

  return (
    <Box direction="column" gap={2}>
      {value.map((item, index) => (
        <div key={index} className="flex items-start gap-x-2">
          <div className="flex-1">
            <ParameterField
              name={`${index}`}
              typeDef={typeDef.inner!}
              value={item}
              depth={depth}
              onChange={(val) => updateItem(index, val)}
            />
          </div>
          <button
            type="button"
            className="mt-1 shrink-0 cursor-pointer p-1 text-text-tertiary transition-colors hover:text-text-negative"
            onClick={() => removeItem(index)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
      <Button variant="text" size="sm" onClick={addItem}>
        {t('extrinsicBuilder.addItem')}
      </Button>
    </Box>
  );
});

function getDefaultValue(typeDef: ParameterTypeDef | undefined): unknown {
  if (!typeDef) return '';

  switch (typeDef.kind) {
    case 'primitive':
      return typeDef.primitiveType === 'bool' ? false : '';
    case 'option':
      return { enabled: false, inner: '' };
    case 'vec':
      return [];
    case 'struct':
    case 'tuple':
      return {};
    case 'enum':
      return { variant: '', values: {} };
    default:
      return '';
  }
}
