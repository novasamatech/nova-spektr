import { memo } from 'react';

import { Switch } from '@/shared/ui';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

export const BoolParamInput = memo(({ value, onChange }: Props) => {
  return (
    <div className="flex items-center gap-x-2 py-1">
      <Switch checked={value} onChange={onChange} />
      <span className="text-footnote text-text-secondary">{value ? 'true' : 'false'}</span>
    </div>
  );
});
