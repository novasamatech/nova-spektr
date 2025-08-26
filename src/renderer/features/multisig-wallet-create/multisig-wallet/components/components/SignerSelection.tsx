import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type AnyAccount, accountService } from '@/domains/network';
import { Signer } from '../../../common/Signer';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

export const SignerSelection = () => {
  const { t } = useI18n();

  const chain = useUnit(formModel.$chain);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const { submit } = useForm(formModel.form);

  const onSubmit = (event: FormEvent, account: AnyAccount) => {
    flowModel.signerSelected(account);
    event.preventDefault();
    submit();
  };

  return (
    <>
      <Modal.Content>
        <ul className="my-1 flex max-h-[660px] w-full max-w-[368px] flex-col gap-y-2 px-3">
          {ownedSignatoriesWallets.map(wallet => {
            if (!chain) return null;

            const accounts = accountService.filterAccountsOnChain(wallet.accounts, chain);
            const account = accounts.at(0);

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
          <Button variant="text" onClick={() => flowModel.stepChanged(Step.SIGNATORIES_THRESHOLD)}>
            {t('createMultisigAccount.backButton')}
          </Button>
        </Box>
      </Modal.Footer>
    </>
  );
};
