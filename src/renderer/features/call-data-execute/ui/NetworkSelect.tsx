import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { InputHint } from '@/shared/ui';
import { ChainSelect } from '@/shared/ui-entities';
import { Field } from '@/shared/ui-kit';
import { formModel } from '../model/form';

export const NetworkSelect = memo(() => {
  const { t } = useI18n();

  const allChains = useUnit(formModel.$allChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.fields.network.label')}>
      <ChainSelect
        placeholder={t('callData.fields.network.placeholder')}
        value={chain.value}
        options={allChains}
        onChange={chain.onChange}
      />
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
});
