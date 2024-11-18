import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type Account, AccountType, type ChainAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { Signer } from './Signer';

export const SignerSelection = () => {
  const { t } = useI18n();

  const { submit } = useForm(formModel.$createMultisigForm);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);
  const chain = useUnit(formModel.$chain);

  const onSubmit = (event: FormEvent, account: Account) => {
    flexibleMultisigModel.events.signerSelected(account);
    event.preventDefault();
    submit();
  };

  return (
    <section className="max-h-[660px] w-modal overflow-x-hidden px-5 pb-4">
      <ul className="my-4 flex flex-col [overflow-y:overlay]">
        {ownedSignatoriesWallets.map(({ accounts, type, name }) => {
          if (!chain || !accounts[0]) return null;

          const account =
            accounts[0].type === AccountType.BASE
              ? accounts[0]
              : accounts.find((account) => (account as ChainAccount).chainId === chain.chainId);

          if (!account) return null;

          return (
            <Signer
              key={`${account.accountId}-${type}`}
              account={account}
              walletName={name}
              walletType={type}
              chain={chain}
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
