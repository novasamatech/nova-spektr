import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { type Account } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Step } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { WalletCardMd, accountUtils } from '@/entities/wallet';
import { flowModel } from '@/widgets/CreateWallet/model/flow-model';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '@/widgets/CreateWallet/model/signatory-model';

export const SignerSelection = () => {
  const { t } = useI18n();

  const chain = useUnit(formModel.$chain);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const { submit } = useForm(formModel.$createMultisigForm);

  const onSubmit = (account: Account) => {
    flowModel.events.signerSelected(account);
    submit();
  };

  return (
    <>
      <Modal.Content>
        <ul className="my-1 flex max-h-[660px] w-full flex-col gap-y-2 px-3">
          {ownedSignatoriesWallets.map((wallet) => {
            if (!chain) return null;

            const account = wallet.accounts.find((account) => {
              return accountUtils.isBaseAccount(account) || account.chainId === chain.chainId;
            });

            if (!account) return null;

            return (
              <li key={`${account.walletId}_${account.accountId}`} className="flex items-center justify-between">
                <WalletCardMd
                  wallet={wallet}
                  description={toAddress(account.accountId, { prefix: chain.addressPrefix, chunk: 12 })}
                  onClick={() => onSubmit(account)}
                >
                  <AccountExplorers accountId={account.accountId} chain={chain} />
                </WalletCardMd>
              </li>
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
