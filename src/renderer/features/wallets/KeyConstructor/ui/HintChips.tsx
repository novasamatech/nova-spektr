import { memo, useCallback, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { constructorModel } from '../model/constructor-model';

type Props = {
  keyId: string;
  derivationPath: string;
  chainName: string;
};

const SHARD_COUNT = 10;
const HARD_SOFT_HINTS = ['//', '/'];
const TYPE_HINTS = ['main', 'hot', 'public', 'sharded'];

export const HintChips = memo(({ keyId, derivationPath, chainName }: Props) => {
  const { t } = useI18n();
  const hints = useMemo(() => {
    if (derivationPath === '' || /[a-z0-9]$/i.test(derivationPath)) {
      return HARD_SOFT_HINTS;
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
    return HARD_SOFT_HINTS;
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
        <Tooltip key={hint} delay={400} side="bottom">
          <Tooltip.Trigger>
            <Button
              size="sm"
              variant="chip"
              pallet="secondary"
              onMouseDown={(e) => {
                e.preventDefault();
                insertHint(keyId, hint);
              }}
            >
              {hint}
            </Button>
          </Tooltip.Trigger>
          {HARD_SOFT_HINTS.includes(hint) && (
            <Tooltip.Content>
              {hint === '/' && t('dynamicDerivations.keysConstructor.softDerivationTooltip')}
              {hint === '//' && t('dynamicDerivations.keysConstructor.hardDerivationTooltip')}
            </Tooltip.Content>
          )}
        </Tooltip>
      ))}
    </div>
  );
});
