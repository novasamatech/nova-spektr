import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { SigningPathSection } from '@/features/signing-path';
import { formModel } from '../model/form';

export const SignatorySelect = memo(() => {
  const { t } = useI18n();

  const signingPath = useUnit(formModel.$signingPath);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const asset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain}
      asset={asset}
      txErrors={[]}
      errorText={t(signatory.errorMessage)}
      onChange={formModel.signingPathChanged}
    />
  );
});
