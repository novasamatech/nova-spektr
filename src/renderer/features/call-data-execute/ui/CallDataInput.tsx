import { memo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { InputHint } from '@/shared/ui';
import { Field, Input } from '@/shared/ui-kit';
import { formModel } from '../model/form';

export const CallDataInput = memo(() => {
  const { t } = useI18n();

  const {
    fields: { callData },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.callData')}>
      <Input height="md" value={callData.value} placeholder={t('callData.placeholder')} onChange={callData.onChange} />
      <InputHint variant="error" active={callData.hasError}>
        {t(callData.errorMessage)}
      </InputHint>
    </Field>
  );
});
