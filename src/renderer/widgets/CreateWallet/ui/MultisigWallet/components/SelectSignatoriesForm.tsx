import { useUnit } from 'effector-react';
import { useForm } from 'effector-forms';

import { Alert, Button, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { networkModel } from '@entities/network';
import { formModel } from '../../../model/form-model';
import { flowModel } from '../../../model/flow-model';
import { walletModel } from '@entities/wallet';
import { contactModel } from '@entities/contact';
import { SelectSignatories } from './SelectAccountSignatories';
import { dictionary } from '@shared/lib/utils';
import { Step } from '../../../lib/types';

export const SelectSignatoriesForm = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hasOwnSignatory = useUnit(flowModel.$hasOwnSignatory);
  const accounts = useUnit(formModel.$availableAccounts);
  const signatories = useUnit(formModel.$signatories);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);

  // fixme this is now how we do it
  // probably put that in the model
  const canContinue = () => {
    const hasEnoughSignatories = signatories.length >= 2;

    return hasOwnSignatory && hasEnoughSignatories && !multisigAlreadyExists;
  };

  return (
    <section className="flex flex-col gap-y-4 px-3 py-4 flex-1 h-full">
      <SmallTitleText className="py-2 px-2">{t('createMultisigAccount.walletFormTitle')}</SmallTitleText>

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
          active={!hasOwnSignatory && Boolean(signatories.length)}
          title={t('createMultisigAccount.walletAlertTitle')}
          variant="error"
        >
          <Alert.Item withDot={false}>{t('createMultisigAccount.noOwnSignatory')}</Alert.Item>
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
