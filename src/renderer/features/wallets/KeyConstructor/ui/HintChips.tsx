import { memo } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { TokenType, parseDerivation } from '@/shared/lib/utils';
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

const getAutocompleteHints = (derivationPath: string, chain: Chain): string[] => {
  const isEthereumBased = networkUtils.isEthereumBased(chain.options);

  if (!derivationPath) {
    return isEthereumBased ? [HARD_DERIVATION] : DERIVATION_SEPARATORS;
  }

  if (derivationPath === '//' || derivationPath === '/') {
    const chainName = chain.parentId ? chain.name : chain.specName;
    const displayChainName = chainName.trim().replaceAll(' ', '_').toLowerCase();
    return [displayChainName];
  }

  const { tokens } = parseDerivation(derivationPath);
  const lastToken = tokens[tokens.length - 1];
  const prevToken = tokens[tokens.length - 2];
  const isLastTokenSeparator = lastToken?.type === TokenType.SOFT || lastToken?.type === TokenType.HARD;

  if (isLastTokenSeparator && prevToken?.type === TokenType.SEGMENT && prevToken.value === 'sharded') {
    return SHARDS_RANGES;
  }

  if (isLastTokenSeparator) {
    return TYPES;
  }

  if (lastToken?.type === TokenType.SEGMENT && lastToken.value.endsWith('...')) {
    return SHARDS_COUNT;
  }

  return isEthereumBased ? [HARD_DERIVATION] : DERIVATION_SEPARATORS;
};

export const HintChips = memo(({ keyId, derivationPath, chain }: Props) => {
  const { t } = useI18n();

  const hints = getAutocompleteHints(derivationPath, chain);

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
