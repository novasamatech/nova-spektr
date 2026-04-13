import { memo, useCallback } from 'react';

import { useI18n } from '@/shared/i18n';
import { Switch } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type ParameterTypeDef } from '../../lib/types';
import { ParameterField } from '../ParameterField';

type Props = {
  typeDef: ParameterTypeDef;
  value: { enabled: boolean; inner: unknown };
  onChange: (value: { enabled: boolean; inner: unknown }) => void;
  depth: number;
};

export const OptionParamInput = memo(({ typeDef, value, onChange, depth }: Props) => {
  const { t } = useI18n();

  const toggleEnabled = useCallback(
    (enabled: boolean) => {
      onChange({ ...value, enabled });
    },
    [value, onChange],
  );

  const handleInnerChange = useCallback(
    (inner: unknown) => {
      onChange({ ...value, inner });
    },
    [value, onChange],
  );

  return (
    <Box direction="column" gap={2}>
      <div className="flex items-center gap-x-2">
        <Switch checked={value.enabled} onChange={toggleEnabled} />
        <span className="text-footnote text-text-secondary">
          {value.enabled ? t('extrinsicBuilder.optionSome') : t('extrinsicBuilder.optionNone')}
        </span>
      </div>
      {value.enabled && typeDef.inner && (
        <ParameterField
          name="value"
          typeDef={typeDef.inner}
          value={value.inner}
          depth={depth}
          onChange={handleInnerChange}
        />
      )}
    </Box>
  );
});
