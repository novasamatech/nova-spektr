import { useStoreMap, useUnit } from 'effector-react';
import { t } from 'i18next';
import { memo, useMemo, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { DerivationError, cnTw, nonNullable } from '@/shared/lib/utils';
import { FootnoteText, HelpText, IconButton } from '@/shared/ui';
import { Input, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { constructorModel } from '../model/constructor-model';

import { HintChips } from './HintChips';

const DerivationErrorText: Record<DerivationError, string> = {
  [DerivationError.EMPTY]: t('dynamicDerivations.keysConstructor.derivationEmpty'),
  [DerivationError.HAS_SPACES]: t('dynamicDerivations.keysConstructor.derivationHasSpaces'),
  [DerivationError.TRIM_SPACES]: t('dynamicDerivations.keysConstructor.derivationTrimSpaces'),
  [DerivationError.PASSWORD_NOT_SUPPORTED]: t('dynamicDerivations.keysConstructor.derivationPasswordNotSupported'),
  [DerivationError.MUST_START_WITH_SLASH]: t('dynamicDerivations.keysConstructor.derivationMustStartWithSlash'),
  [DerivationError.ENDS_WITH_SLASH]: t('dynamicDerivations.keysConstructor.derivationCannotEndWithSlash'),
  [DerivationError.DUPLICATE]: t('dynamicDerivations.keysConstructor.derivationDuplicate'),
  [DerivationError.ETHEREUM_SINGLE_SLASH]: t('dynamicDerivations.keysConstructor.derivationEthereumSingleSlash'),
};

type Props = {
  keyId: string;
  keyIndex: number;
};

export const KeyItem = memo(({ keyId, keyIndex }: Props) => {
  const { t } = useI18n();
  const [showHints, setShowHints] = useState(false);

  const chains = useUnit(networkModel.$chains);
  const chainsList = useMemo(() => Object.values(chains), [chains]);

  const keyData = useStoreMap({
    store: constructorModel.$keys,
    keys: [keyId],
    fn: (keys, [id]) => keys[id] ?? null,
  });
  if (!keyData) return null;

  const error = useStoreMap({
    store: constructorModel.$errors,
    keys: [keyId],
    fn: (errors, [id]) => errors[id]?.[0] ?? null,
  });

  const chain = chains[keyData.chainId];
  if (!chain) return null;

  const handleInputBlur = () => {
    setShowHints(false);
    constructorModel.validateKey(keyId);
  };

  const handleInputFocus = () => {
    setShowHints(true);
  };

  const handleKeyRemove = () => {
    constructorModel.removeKey(keyId);
  };

  const handleUpdateChainId = (newChainId: ChainId) => {
    constructorModel.updateKey([keyId, { chainId: newChainId }]);
  };

  const handleUpdateDerivation = (newDerivationPath: string) => {
    constructorModel.updateKey([keyId, { derivationPath: newDerivationPath }]);
  };

  return (
    <div className="mb-6 grid grid-cols-[34px_60px_1fr_54px] gap-y-2">
      <div className="col-start-1 flex items-center justify-start">
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.keysConstructor.indexLabel')}</HelpText>
      </div>
      <div className="col-start-2">
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.keysConstructor.networkLabel')}</HelpText>
      </div>
      <div className="col-start-3">
        <HelpText className="text-text-tertiary">
          {t('dynamicDerivations.keysConstructor.derivationPathLabel')}
        </HelpText>
      </div>

      <div className="col-start-1 flex items-center justify-start">
        <HelpText className="text-text-tertiary">{keyIndex}</HelpText>
      </div>
      <div className="col-start-2">
        <Select name={chain.name} placeholder="" value={keyData.chainId} onChange={handleUpdateChainId}>
          {chainsList.map((chain) => (
            <Select.Item value={chain.chainId} key={chain.chainId}>
              <ChainTitle fontClass="text-text-primary truncate" key={chain.chainId} chain={chain} />
            </Select.Item>
          ))}
        </Select>
      </div>
      <div className="col-start-3">
        <Input
          name={keyData.derivationPath}
          placeholder={t('dynamicDerivations.keysConstructor.derivationPlaceholder')}
          invalid={nonNullable(error)}
          value={keyData.derivationPath}
          onChange={handleUpdateDerivation}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
        />
      </div>
      <div className="col-start-4 flex items-center justify-end">
        <IconButton
          name="delete"
          className="w-max shrink-0 hover:text-text-negative focus:text-text-negative"
          onClick={handleKeyRemove}
        />
      </div>
      <div className={cnTw('col-start-3', { hidden: !error })}>
        <FootnoteText className="text-text-negative">{DerivationErrorText[error]}</FootnoteText>
      </div>
      <div className={cnTw('col-start-3', { hidden: !showHints })}>
        <HintChips keyId={keyId} derivationPath={keyData.derivationPath} chain={chain} />
      </div>
    </div>
  );
});

KeyItem.displayName = 'KeyItem';
