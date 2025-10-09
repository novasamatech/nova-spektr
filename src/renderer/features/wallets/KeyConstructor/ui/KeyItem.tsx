import { useStoreMap, useUnit } from 'effector-react';
import { t } from 'i18next';
import { memo, useCallback, useState } from 'react';

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
};

type Props = {
  keyId: string;
  keyIndex: number;
};

export const KeyItem = memo(({ keyId, keyIndex }: Props) => {
  const { t } = useI18n();
  const [showHints, setShowHints] = useState(false);

  const chains = useUnit(networkModel.$chains);
  const keyData = useStoreMap({
    store: constructorModel.$keys,
    keys: [keyId],
    fn: (keys, [id]) => keys[id] ?? null,
  });
  const error = useStoreMap({
    store: constructorModel.$errors,
    keys: [keyId],
    fn: (errors, [id]) => errors[id]?.[0] ?? null,
  });

  const chain = chains[keyData.chainId];

  const handleInputBlur = useCallback(() => {
    setShowHints(false);
    constructorModel.validateKey(keyId);
  }, [keyId]);

  const handleInputFocus = useCallback(() => {
    setShowHints(true);
  }, []);

  const handleKeyRemove = useCallback(() => {
    constructorModel.removeKey(keyId);
  }, [keyId]);

  const handleUpdateChainId = useCallback(
    (newChainId: ChainId) => {
      constructorModel.updateKey([keyId, { chainId: newChainId }]);
    },
    [keyId],
  );

  const handleUpdateDerivation = useCallback(
    (newDerivationPath: string) => {
      constructorModel.updateKey([keyId, { derivationPath: newDerivationPath }]);
    },
    [keyId],
  );

  return (
    <div className="mb-6 grid grid-cols-[20px_12px_60px_0px_1fr_24px_28px] gap-y-2">
      <div className="col-start-1 flex justify-center">
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.keysConstructor.indexLabel')}</HelpText>
      </div>
      <div className="col-start-3">
        <HelpText className="text-text-tertiary">{t('dynamicDerivations.keysConstructor.networkLabel')}</HelpText>
      </div>
      <div className="col-start-5">
        <HelpText className="text-text-tertiary">
          {t('dynamicDerivations.keysConstructor.derivationPathLabel')}
        </HelpText>
      </div>
      <div className="col-start-7" />

      <div className="col-start-1 flex items-center justify-center">
        <HelpText className="text-text-tertiary">{String(keyIndex)}</HelpText>
      </div>
      <div className="col-start-3">
        <Select name={chain.name} placeholder="" value={keyData.chainId} onChange={handleUpdateChainId}>
          {Object.values(chains).map((chain) => (
            <Select.Item value={chain.chainId} key={chain.chainId}>
              <ChainTitle fontClass="text-text-primary truncate" key={chain.chainId} chain={chain} />
            </Select.Item>
          ))}
        </Select>
      </div>
      <div className="col-start-5">
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
      <div className="col-start-7 flex items-center justify-center">
        <IconButton
          name="delete"
          className="mr-9 ml-2 w-max shrink-0 hover:text-text-negative focus:text-text-negative"
          onClick={handleKeyRemove}
        />
      </div>
      <div className={cnTw('col-start-5', { hidden: !error })}>
        <FootnoteText className="text-text-negative">{DerivationErrorText[error]}</FootnoteText>
      </div>
      <div className={cnTw('col-start-5', { hidden: !showHints })}>
        <HintChips keyId={keyId} derivationPath={keyData.derivationPath} chainName={chain.specName} />
      </div>
    </div>
  );
});
