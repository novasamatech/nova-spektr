import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect, useRef } from 'react';

import { KeyType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, InputHint } from '@/shared/ui';
import { Box, Checkbox, Field, Input, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { constructorModel } from '../model/constructor-model';

import { ShardInfoPopover } from './ShardInfoPopover';

export const KeyForm = () => {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    submit,
    isValid,
    isDirty,
    fields: { chainId, keyType, isSharded, shards, keyName, derivationPath },
  } = useForm(constructorModel.$constructorForm);

  const chains = useUnit(networkModel.$chains);
  const isKeyTypeSharded = useUnit(constructorModel.$isKeyTypeSharded);
  const derivationEnabled = useUnit(constructorModel.$derivationEnabled);

  useEffect(() => {
    if (isDirty || !formRef.current) return;

    formRef.current.querySelector<HTMLButtonElement>(`[name=${chainId.name}]`)?.focus();
  }, [isDirty]);

  useEffect(() => {
    if (isValid || !formRef.current) return;

    for (const field of [keyType, shards, keyName, derivationPath]) {
      if (!field.hasError()) continue;

      formRef.current.querySelector<HTMLInputElement>(`[name=${field.name}]`)?.focus();
      break;
    }
  }, [isValid]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <form ref={formRef} onSubmit={submitForm}>
      <div className="mb-4 flex items-start gap-x-6">
        <Box width="228px">
          <Field text={t('dynamicDerivations.constructor.networkLabel')}>
            <Select
              name={chainId.name}
              placeholder={t('dynamicDerivations.constructor.networkPlaceholder')}
              value={chainId.value}
              onChange={chainId.onChange}
            >
              {Object.values(chains).map((chain) => (
                <Select.Item value={chain.chainId} key={chain.chainId}>
                  <ChainTitle
                    className="overflow-hidden"
                    fontClass="text-text-primary truncate"
                    key={chain.chainId}
                    chain={chain}
                  />
                </Select.Item>
              ))}
            </Select>
          </Field>
        </Box>

        <Box width="256px">
          <Field text={t('dynamicDerivations.constructor.keyTypeLabel')}>
            <Select
              name={keyType.name}
              placeholder={t('dynamicDerivations.constructor.keyTypePlaceholder')}
              value={keyType.value}
              invalid={keyType.hasError()}
              onChange={keyType.onChange}
            >
              <Select.Item value={KeyType.MAIN}>{t('dynamicDerivations.constructor.keyTypeMain')}</Select.Item>
              <Select.Item value={KeyType.HOT}>{t('dynamicDerivations.constructor.keyTypeHot')}</Select.Item>
              <Select.Item value={KeyType.PUBLIC}>{t('dynamicDerivations.constructor.keyTypePublic')}</Select.Item>
              <Select.Item value={KeyType.CUSTOM}>{t('dynamicDerivations.constructor.keyTypeCustom')}</Select.Item>
            </Select>
            <InputHint variant="error" active={keyType.hasError()}>
              {t(keyType.errorText())}
            </InputHint>
          </Field>
        </Box>

        <div className="mt-6.5 flex items-center gap-x-1 py-2">
          <Checkbox disabled={!isKeyTypeSharded} checked={isSharded.value} onChange={isSharded.onChange}>
            {t('dynamicDerivations.constructor.shardedLabel')}
          </Checkbox>
          <ShardInfoPopover />
        </div>

        <Box width="80px">
          <Field text={t('dynamicDerivations.constructor.shardsLabel')}>
            <Input
              name={shards.name}
              placeholder={t('dynamicDerivations.constructor.shardsPlaceholder')}
              invalid={shards.hasError()}
              disabled={!isKeyTypeSharded || !isSharded.value}
              value={shards.value}
              onChange={shards.onChange}
            />
            <InputHint variant="error" active={shards.hasError()}>
              {t(shards.errorText())}
            </InputHint>
          </Field>
        </Box>
      </div>
      <div className="flex items-start gap-x-6">
        <Box width="228px">
          <Field text={t('dynamicDerivations.constructor.keyNameLabel')}>
            <Input
              name={keyName.name}
              placeholder={t('dynamicDerivations.constructor.keyNamePlaceholder')}
              invalid={keyName.hasError()}
              value={keyName.value}
              onChange={keyName.onChange}
            />
            <InputHint variant="error" active={keyName.hasError()}>
              {t(keyName.errorText())}
            </InputHint>
          </Field>
        </Box>

        <Box width="354px">
          <Field text={t('dynamicDerivations.constructor.derivationLabel')}>
            <Input
              name={derivationPath.name}
              placeholder={t('dynamicDerivations.constructor.derivationPlaceholder')}
              invalid={derivationPath.hasError()}
              value={derivationPath.value}
              disabled={!derivationEnabled}
              onChange={derivationPath.onChange}
            />
            <InputHint variant="error" active={derivationPath.hasError()}>
              {t(derivationPath.errorText())}
            </InputHint>
          </Field>
        </Box>

        <Button className="mb-1 mt-7.5" type="submit" pallet="secondary" size="sm" disabled={!isValid}>
          {t('dynamicDerivations.constructor.newKeyButton')}
        </Button>
      </div>
    </form>
  );
};
