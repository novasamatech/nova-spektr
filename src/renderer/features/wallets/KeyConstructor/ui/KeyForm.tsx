import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect, useMemo, useRef } from 'react';

import { KeyType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, InputHint, Select } from '@/shared/ui';
import { Box, Checkbox, Field, Input } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { constructorModel } from '../model/constructor-model';

import { ShardInfoPopover } from './ShardInfoPopover';

export const KeyForm = () => {
  const { t } = useI18n();
  const networkRef = useRef<HTMLButtonElement>(null);

  const {
    submit,
    isValid,
    fields: { network, keyType, isSharded, shards, keyName, derivationPath },
  } = useForm(constructorModel.$constructorForm);

  const chains = useUnit(networkModel.$chains);
  const isKeyTypeSharded = useUnit(constructorModel.$isKeyTypeSharded);
  const derivationEnabled = useUnit(constructorModel.$derivationEnabled);

  useEffect(() => {
    if (!networkRef.current) return;

    constructorModel.events.focusableSet(networkRef.current);
  }, []);

  const networks = useMemo(() => {
    return Object.values(chains).map((chain) => ({
      id: chain.chainId,
      value: chain,
      element: (
        <ChainTitle
          className="overflow-hidden"
          fontClass="text-text-primary truncate"
          key={chain.chainId}
          chain={chain}
        />
      ),
    }));
  }, []);

  const keyTypes = [
    {
      id: KeyType.MAIN,
      value: KeyType.MAIN,
      element: (
        <FootnoteText className="text-text-secondary">{t('dynamicDerivations.constructor.keyTypeMain')}</FootnoteText>
      ),
    },
    {
      id: KeyType.HOT,
      value: KeyType.HOT,
      element: (
        <FootnoteText className="text-text-secondary">{t('dynamicDerivations.constructor.keyTypeHot')}</FootnoteText>
      ),
    },
    {
      id: KeyType.PUBLIC,
      value: KeyType.PUBLIC,
      element: (
        <FootnoteText className="text-text-secondary">{t('dynamicDerivations.constructor.keyTypePublic')}</FootnoteText>
      ),
    },
    {
      id: KeyType.CUSTOM,
      value: KeyType.CUSTOM,
      element: (
        <FootnoteText className="text-text-secondary">{t('dynamicDerivations.constructor.keyTypeCustom')}</FootnoteText>
      ),
    },
  ];

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form onSubmit={submitForm}>
      <div className="mb-4 flex items-start gap-x-6">
        <Select
          ref={networkRef}
          className="w-[228px]"
          label={t('dynamicDerivations.constructor.networkLabel')}
          placeholder={t('dynamicDerivations.constructor.networkPlaceholder')}
          selectedId={network?.value?.chainId}
          options={networks}
          onChange={({ value }) => network?.onChange(value)}
        />
        <div className="flex flex-col gap-y-2">
          <Select
            className="w-[256px]"
            label={t('dynamicDerivations.constructor.keyTypeLabel')}
            placeholder={t('dynamicDerivations.constructor.keyTypePlaceholder')}
            invalid={keyType?.hasError()}
            selectedId={keyType?.value}
            options={keyTypes}
            onChange={({ value }) => keyType?.onChange(value)}
          />
          <InputHint variant="error" active={keyType?.hasError()}>
            {t(keyType?.errorText())}
          </InputHint>
        </div>
        <div className="mt-6.5 flex items-center gap-x-1 py-2">
          <Checkbox
            disabled={!isKeyTypeSharded}
            checked={isSharded?.value}
            onChange={(checked) => isSharded?.onChange(checked)}
          >
            {t('dynamicDerivations.constructor.shardedLabel')}
          </Checkbox>
          <ShardInfoPopover />
        </div>
        <div className="flex flex-col gap-y-2">
          <Box width="80px">
            <Field text={t('dynamicDerivations.constructor.shardsLabel')}>
              <Input
                height="sm"
                placeholder={t('dynamicDerivations.constructor.shardsPlaceholder')}
                invalid={shards?.hasError()}
                disabled={!isKeyTypeSharded || !isSharded?.value}
                value={shards?.value}
                onChange={shards?.onChange}
              />
            </Field>
          </Box>
          <InputHint variant="error" active={shards?.hasError()}>
            {t(shards?.errorText())}
          </InputHint>
        </div>
      </div>
      <div className="flex items-start gap-x-6">
        <div className="flex flex-col gap-y-2">
          <Box width="228px">
            <Field text={t('dynamicDerivations.constructor.keyNameLabel')}>
              <Input
                height="sm"
                placeholder={t('dynamicDerivations.constructor.keyNamePlaceholder')}
                invalid={keyName?.hasError()}
                value={keyName?.value}
                onChange={keyName?.onChange}
              />
            </Field>
          </Box>
          <InputHint variant="error" active={keyName?.hasError()}>
            {t(keyName?.errorText())}
          </InputHint>
        </div>
        <div className="flex flex-col gap-y-2">
          <Box width="354px">
            <Field text={t('dynamicDerivations.constructor.derivationLabel')}>
              <Input
                height="sm"
                placeholder={t('dynamicDerivations.constructor.derivationPlaceholder')}
                invalid={derivationPath?.hasError()}
                value={derivationPath?.value}
                disabled={!derivationEnabled}
                onChange={derivationPath?.onChange}
              />
            </Field>
          </Box>
          <InputHint variant="error" active={derivationPath?.hasError()}>
            {t(derivationPath?.errorText())}
          </InputHint>
        </div>

        <Button className="mb-1 mt-7.5" type="submit" pallet="secondary" size="sm" disabled={!isValid}>
          {t('dynamicDerivations.constructor.newKeyButton')}
        </Button>
      </div>
    </form>
  );
};
