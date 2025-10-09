import { memo, useCallback, useMemo } from 'react';

import { Button } from '@/shared/ui';
import { constructorModel } from '../model/constructor-model';

type Props = {
  keyId: string;
  derivationPath: string;
  chainName: string;
};

const SHARD_COUNT = 10;
const DEFAULT_HINTS = ['//', '/'];
const TYPE_HINTS = ['main', 'hot', 'public', 'sharded'];

export const HintChips = memo(({ keyId, derivationPath, chainName }: Props) => {
  const hints = useMemo(() => {
    if (derivationPath === '' || /[a-z0-9]$/i.test(derivationPath)) {
      return DEFAULT_HINTS;
    }
    if (derivationPath === '//' || derivationPath === '/') {
      return [chainName];
    }
    if (derivationPath.endsWith('sharded//') || derivationPath.endsWith('sharded/')) {
      return Array.from({ length: SHARD_COUNT }, (_, i) => String(i));
    }
    if (derivationPath.endsWith('//') || derivationPath.endsWith('/')) {
      return TYPE_HINTS;
    }
    return DEFAULT_HINTS;
  }, [derivationPath]);

  const insertHint = useCallback(
    (keyId: string, hint: string) => {
      const newDerivationPath = derivationPath + hint;
      constructorModel.updateKey([keyId, { derivationPath: newDerivationPath }]);
    },
    [derivationPath],
  );

  return (
    <div className="flex flex-row gap-x-2">
      {hints.map((hint) => (
        <Button
          size="sm"
          variant="chip"
          pallet="secondary"
          key={hint}
          onMouseDown={(e) => {
            e.preventDefault();
            insertHint(keyId, hint);
          }}
        >
          {hint}
        </Button>
      ))}
    </div>
  );
});
