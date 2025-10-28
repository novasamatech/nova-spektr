import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { networkUtils } from '@/entities/network';
import { constructorModel } from '../model/constructor-model';

type Props = {
  keyId: string;
  derivationPath: string;
  chain: Chain;
};

const SHARD_COUNT = 10;
const HARD_DERIVATION = '//';
const SOFT_DERIVATION = '/';
const DERIVATION_SEPARATORS = [HARD_DERIVATION, SOFT_DERIVATION];
const TYPE_HINTS = ['main', 'hot', 'public', 'sharded'];

const generateShardHints = () => Array.from({ length: SHARD_COUNT }, (_, index) => String(index));

const getDerivationPathHints = (derivationPath: string, chain: Chain): string[] => {
  const isEthereumBased = networkUtils.isEthereumBased(chain.options);
  const chainName = chain.name.trim().replaceAll(' ', '_').toLowerCase();

  if (derivationPath === '' || /[a-z0-9]$/i.test(derivationPath)) {
    if (isEthereumBased) return [HARD_DERIVATION];
    return DERIVATION_SEPARATORS;
  }

  if (derivationPath === '//' || derivationPath === '/') {
    return [chainName];
  }

  if (derivationPath.endsWith('sharded//') || derivationPath.endsWith('sharded/')) {
    return generateShardHints();
  }

  if (derivationPath.endsWith('//') || derivationPath.endsWith('/')) {
    return TYPE_HINTS;
  }

  return DERIVATION_SEPARATORS;
};

export const HintChips = memo(({ keyId, derivationPath, chain }: Props) => {
  const { t } = useI18n();

  const hints = getDerivationPathHints(derivationPath, chain);

  const insertHint = (hint: string) => {
    const newDerivationPath = derivationPath + hint;
    constructorModel.updateKey([keyId, { derivationPath: newDerivationPath }]);
  };

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
                insertHint(hint);
              }}
            >
              {hint}
            </Button>
          </Tooltip.Trigger>
          {DERIVATION_SEPARATORS.includes(hint) && (
            <Tooltip.Content>
              {hint === HARD_DERIVATION && t('dynamicDerivations.keysConstructor.hardDerivationTooltip')}
              {hint === SOFT_DERIVATION && t('dynamicDerivations.keysConstructor.softDerivationTooltip')}
            </Tooltip.Content>
          )}
        </Tooltip>
      ))}
    </div>
  );
});

HintChips.displayName = 'HintChips';
