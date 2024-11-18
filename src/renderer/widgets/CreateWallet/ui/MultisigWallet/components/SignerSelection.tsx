import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type Account, AccountType, type ChainAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Step } from '@/widgets/CreateWallet/lib/types';
import { flowModel } from '@/widgets/CreateWallet/model/flow-model';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '@/widgets/CreateWallet/model/signatory-model';

import { Signer } from './Signer';

export const SignerSelection = () => {
  const { t } = useI18n();

  const chain = useUnit(formModel.$chain);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets) || [];

  const { submit } = useForm(formModel.$createMultisigForm);

  const onSubmit = (event: FormEvent, account: Account) => {
    flowModel.events.signerSelected(account);
    event.preventDefault();
    submit();
  };

  return (
    <section className="max-h-[660px] w-full overflow-x-hidden px-5 pb-4">
      <ul className="my-4 flex flex-col [overflow-y:overlay]">
        {ownedSignatoriesWallets.map(({ accounts, type, name }) => {
          if (!chain) return null;

          const account =
            accounts[0].type === AccountType.BASE
              ? accounts[0]
              : accounts.find((account) => (account as ChainAccount).chainId === chain.chainId);

          if (!account) return null;

          return (
            <Signer
              key={account.accountId}
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
            flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD);
          }}
        >
          {t('createMultisigAccount.backButton')}
        </Button>
      </div>
    </section>
  );
};
