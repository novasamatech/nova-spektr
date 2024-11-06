import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type AccountId, AccountType, type ChainAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { Signer } from './Signer';

export const SignerSelection = () => {
  const { t } = useI18n();

  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);
  const {
    fields: { chain },
    submit,
  } = useForm(formModel.$createMultisigForm);

  const onSubmit = (event: FormEvent, accountId: AccountId) => {
    flexibleMultisigModel.events.signerSelected(accountId);
    event.preventDefault();
    submit();
  };

  return (
    <section className="max-h-[660px] w-full overflow-x-hidden px-5 pb-4">
      <ul className="my-4 flex flex-col [overflow-y:overlay]">
        {ownedSignatoriesWallets.map(({ accounts, type, name }) => {
          const { accountId } =
            accounts[0].type === AccountType.BASE
              ? accounts[0]
              : accounts.find((account) => (account as ChainAccount).chainId === chain.value.chainId) || {};
          if (!accountId) {
            return null;
          }

          return (
            <Signer
              key={accountId}
              accountId={accountId}
              walletName={name}
              walletType={type}
              chain={chain.value}
              onSubmit={onSubmit}
            />
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between">
        <Button
          variant="text"
          onClick={() => {
            flexibleMultisigModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD);
          }}
        >
          {t('createMultisigAccount.backButton')}
        </Button>
      </div>
    </section>
  );
};
