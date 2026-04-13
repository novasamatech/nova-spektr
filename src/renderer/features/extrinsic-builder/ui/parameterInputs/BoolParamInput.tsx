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
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <span className="text-footnote text-text-secondary">{value ? 'true' : 'false'}</span>
    </div>
  );
});
