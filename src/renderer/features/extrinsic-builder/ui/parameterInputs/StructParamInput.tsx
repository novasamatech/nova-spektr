import { type ApiPromise } from '@polkadot/api';
import { memo, useCallback } from 'react';

import { Box } from '@/shared/ui-kit';
import { type ParameterTypeDef } from '../../lib/types';
import { ParameterField } from '../ParameterField';

type Props = {
  typeDef: ParameterTypeDef;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  depth: number;
  api: ApiPromise | null;
};

export const StructParamInput = memo(({ typeDef, value, onChange, depth, api }: Props) => {
  const fields = typeDef.fields ?? [];

  const handleFieldChange = useCallback(
    (fieldName: string, fieldValue: unknown) => {
      onChange({ ...value, [fieldName]: fieldValue });
    },
    [value, onChange],
  );

  return (
    <Box direction="column" gap={2}>
      {fields.map((field) => (
        <ParameterField
          key={field.name}
          name={field.name}
          typeDef={field.typeDef}
          value={value[field.name]}
          depth={depth}
          api={api}
          onChange={(val) => handleFieldChange(field.name, val)}
        />
      ))}
    </Box>
  );
});
