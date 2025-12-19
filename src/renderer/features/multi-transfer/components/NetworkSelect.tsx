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

  const availableChains = useUnit(formModel.$availableChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  return (
    <Field text={t('multiTransfer.form.fields.network.label', 'Recipient network')}>
      <ChainSelect
        placeholder={t('multiTransfer.form.fields.network.placeholder', 'Select network...')}
        value={chain.value}
        options={availableChains}
        onChange={chain.onChange}
      />
      <InputHint variant="error" active={chain.hasError}>
        {chain.errorMessage && t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
});
