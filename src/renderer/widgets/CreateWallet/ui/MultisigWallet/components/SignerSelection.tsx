import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@app/providers';
import { type AccountId, AccountType, type ChainAccount } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { Button, SmallTitleText } from '@/shared/ui';
import { AddressWithName } from '@/entities/wallet';
import { Step } from '@/widgets/CreateWallet/lib/types';
import { flowModel } from '@/widgets/CreateWallet/model/flow-model';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '@/widgets/CreateWallet/model/signatory-model';

export const SignerSelection = () => {
  const { t } = useI18n();
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets) || [];
  console.log('ownedSignatoriesWallets', ownedSignatoriesWallets);
  const {
    fields: { chain },
    submit,
  } = useForm(formModel.$createMultisigForm);

  const onSubmit = (event: FormEvent, accountId: AccountId) => {
    flowModel.events.signerSelected(accountId);
    event.preventDefault();
    submit();
  };

  return (
    <section className="max-h-[660px] w-full overflow-x-hidden px-5 py-4">
      <SmallTitleText className="px-5 text-text-secondary">{t('createMultisigAccount.selectSigner')}</SmallTitleText>
      <ul className="my-4 flex flex-col [overflow-y:overlay]">
        {ownedSignatoriesWallets.map(({ accounts }) => {
          const { accountId, name } =
            accounts[0].type === AccountType.BASE
              ? accounts[0]
              : accounts.find((account) => (account as ChainAccount).chainId === chain.value.chainId) || {};
          if (!accountId) {
            return null;
          }

          return (
            <li
              className="h-10items-center cursor-pointer truncate py-4 pl-5 pr-2 hover:bg-hover"
              key={accountId}
              onClick={(e) => onSubmit(e, accountId)}
            >
              <AddressWithName name={name} address={toAddress(accountId, { prefix: chain.value.addressPrefix })} />
            </li>
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
