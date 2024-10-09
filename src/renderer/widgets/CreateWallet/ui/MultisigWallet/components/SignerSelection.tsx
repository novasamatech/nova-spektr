import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { useI18n } from '@app/providers';
import { type AccountId, AccountType, type ChainAccount } from '@/shared/core';
import { Button } from '@/shared/ui';
import { balanceSubModel } from '@/features/balances';
import { Step } from '@/widgets/CreateWallet/lib/types';
import { flowModel } from '@/widgets/CreateWallet/model/flow-model';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '@/widgets/CreateWallet/model/signatory-model';

import { Signer } from './Signer';

export const SignerSelection = () => {
  const { t } = useI18n();
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets) || [];
  const {
    fields: { chain },
    submit,
  } = useForm(formModel.$createMultisigForm);

  useEffect(() => {
    for (const ownedSignatoriesWallet of ownedSignatoriesWallets) {
      balanceSubModel.events.walletToSubSet(ownedSignatoriesWallet);
    }
  }, [ownedSignatoriesWallets]);

  const onSubmit = (event: FormEvent, accountId: AccountId) => {
    flowModel.events.signerSelected(accountId);
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
            flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD);
          }}
        >
          {t('createMultisigAccount.backButton')}
        </Button>
      </div>
    </section>
  );
};
