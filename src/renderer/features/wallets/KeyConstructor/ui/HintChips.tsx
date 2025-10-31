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

const HARD_DERIVATION = '//';
const SOFT_DERIVATION = '/';
const DERIVATION_SEPARATORS = [HARD_DERIVATION, SOFT_DERIVATION];
const TYPES = ['main', 'hot', 'public', 'sharded'];
const SHARDS_COUNT = ['2', '3', '5', '10', '15', '20', '25', '50'];
const SHARDS_RANGES = SHARDS_COUNT.map((count) => `0...${count}`);

const getDerivationPathHints = (derivationPath: string, chain: Chain): string[] => {
  const isEthereumBased = networkUtils.isEthereumBased(chain.options);
  const chainName = chain.parentId ? chain.name : chain.specName;
  const displayChainName = chainName.trim().replaceAll(' ', '_').toLowerCase();

  if (derivationPath === '' || /[a-z0-9]$/i.test(derivationPath)) {
    if (isEthereumBased) return [HARD_DERIVATION];
    return DERIVATION_SEPARATORS;
  }

  if (derivationPath === '//' || derivationPath === '/') {
    return [displayChainName];
  }

  if (derivationPath.endsWith('sharded//') || derivationPath.endsWith('sharded/')) {
    return SHARDS_RANGES;
  }

  if (derivationPath.endsWith('...')) {
    return SHARDS_COUNT;
  }

  if (derivationPath.endsWith('//') || derivationPath.endsWith('/')) {
    return TYPES;
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
