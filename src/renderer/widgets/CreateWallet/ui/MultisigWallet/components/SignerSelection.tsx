import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { type Account } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { accountUtils } from '@/entities/wallet';
import { flowModel } from '../../../model/flow-model';
import { formModel } from '../../../model/form-model';
import { signatoryModel } from '../../../model/signatory-model';

import { Signer } from './Signer';

export const SignerSelection = () => {
  const { t } = useI18n();

  const chain = useUnit(formModel.$chain);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const { submit } = useForm(formModel.$createMultisigForm);

  const onSubmit = (event: FormEvent, account: Account) => {
    flowModel.events.signerSelected(account);
    event.preventDefault();
    submit();
  };

  return (
    <>
      <Modal.Content>
        <ul className="my-1 flex max-h-[660px] w-full max-w-[368px] flex-col gap-y-2 px-3">
          {ownedSignatoriesWallets.map((wallet) => {
            if (!chain) return null;

            const account = wallet.accounts.find((account) => {
              return accountUtils.isBaseAccount(account) || account.chainId === chain.chainId;
            });

            if (!account) return null;

            return (
              <Signer
                key={`${account.walletId}_${account.accountId}`}
                account={account}
                wallet={wallet}
                chain={chain}
                onSubmit={onSubmit}
              />
            );
          })}
        </ul>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="start" verticalAlign="center">
          <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}>
            {t('createMultisigAccount.backButton')}
          </Button>
        </Box>
      </Modal.Footer>
    </>
  );
};
