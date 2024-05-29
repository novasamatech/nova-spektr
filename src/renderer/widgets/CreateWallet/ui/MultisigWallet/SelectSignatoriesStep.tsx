import { useUnit } from 'effector-react';
import { useForm } from 'effector-forms';

import { Alert, Button } from '@shared/ui';
import { useI18n } from '@app/providers';
import { formModel } from '../../model/form-model';
import { flowModel } from '../../model/flow-model';
import { walletModel } from '@entities/wallet';
import { contactModel } from '@entities/contact';
import { SelectSignatories } from './components/SelectSignatories';
import { dictionary } from '@shared/lib/utils';
import { Step } from '../../lib/types';

export const SelectSignatoriesStep = () => {
  const { t } = useI18n();

  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hasOwnSignatory = useUnit(formModel.$hasOwnSignatory);
  const accounts = useUnit(formModel.$availableAccounts);
  const signatories = useUnit(formModel.$signatories);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  const hasEnoughSignatories = signatories.length >= 2;
  const canContinue = hasOwnSignatory && hasEnoughSignatories && !multisigAlreadyExists;

  console.log('<><> canContinue', canContinue);
  console.log('<><> hasOwnSignatory', hasOwnSignatory);

  return (
    <section className="flex flex-col gap-y-4 px-3 py-4 flex-1 h-full">
      <SelectSignatories
        isActive
        accounts={accounts}
        wallets={dictionary(wallets, 'id')}
        contacts={contacts}
        chain={chain.value}
        onSelect={(accounts, contacts) => {
          formModel.events.accountSignatoriesChanged(accounts);
          formModel.events.contactSignatoriesChanged(contacts);
        }}
      />
      <div className="flex gap-x-4 items-end">
        <Alert
          active={!hasOwnSignatory && signatories.length > 0}
          title={t('createMultisigAccount.noOwnSignatoryTitle')}
          variant="error"
        >
          <Alert.Item withDot={false}>{t('createMultisigAccount.noOwnSignatory')}</Alert.Item>
        </Alert>
        <Alert
          active={hasOwnSignatory && !hasEnoughSignatories}
          title={t('createMultisigAccount.notEnoughSignatoriesTitle')}
          variant="error"
        >
          <Alert.Item withDot={false}>{t('createMultisigAccount.notEnoughSignatories')}</Alert.Item>
        </Alert>
      </div>
      <div className="flex justify-between items-center mt-auto">
        <Button key="create" disabled={!canContinue} onClick={() => flowModel.events.stepChanged(Step.NAMETHRESHOLD)}>
          {t('createMultisigAccount.continueButton')}
        </Button>
      </div>
    </section>
  );
};
