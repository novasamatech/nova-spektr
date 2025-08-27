import { useUnit } from 'effector-react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId, toShortAddress } from '@/shared/lib/utils';
import { HeaderTitleText, HelpText } from '@/shared/ui';
import { AccountExplorers } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { ContactItem, WalletCardMd, walletModel, walletUtils } from '@/entities/wallet';
import { type SignatoryInfo } from '../../types';

type Props = {
  chain: Chain;
  signatories: Omit<SignatoryInfo, 'index'>[];
  children: React.ReactNode;
};

export const SelectedSignatoriesModal = ({ signatories, chain, children }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  return (
    <Modal size="sm">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <HeaderTitleText>{t('createMultisigAccount.selectedSignatoriesTitle')}</HeaderTitleText>
      </Modal.Title>
      <Modal.Content>
        <ul className="flex max-h-[660px] w-full flex-col gap-y-2 px-3 pt-2 pb-4">
          {signatories.map(({ address, walletId }) => {
            if (!walletId) {
              return (
                <li key={address} className="flex items-center justify-between">
                  <ContactItem address={address}>
                    <AccountExplorers accountId={toAccountId(address)} chain={chain} />
                  </ContactItem>
                </li>
              );
            }

            const wallet = walletUtils.getWalletById(wallets, Number(walletId));
            if (!wallet) return null;

            return (
              <li key={address} className="flex items-center justify-between">
                <WalletCardMd
                  wallet={wallet}
                  description={
                    <HelpText className="truncate text-text-tertiary">{toShortAddress(address, 12)}</HelpText>
                  }
                >
                  <AccountExplorers accountId={toAccountId(address)} chain={chain} />
                </WalletCardMd>
              </li>
            );
          })}
        </ul>
      </Modal.Content>
    </Modal>
  );
};
