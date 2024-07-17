import { useI18n } from '@app/providers';

import { type Chain, WalletType } from '@shared/core';
import { RootExplorers, cnTw } from '@shared/lib/utils';
import { FootnoteText, HelpText, SmallTitleText } from '@shared/ui';

import { ContactItem, ExplorersPopover } from '@entities/wallet';

import { type ExtendedAccount, type ExtendedContact, type ExtendedWallet } from '../common/types';

import { WalletItem } from './WalletItem';

type Props = {
  wallets?: ExtendedWallet[];
  accounts?: ExtendedAccount[];
  contacts: ExtendedContact[];
  chain?: Chain;
};

export const ConfirmSignatories = ({ chain, wallets = [], accounts = [], contacts }: Props) => {
  const { t } = useI18n();

  const explorers = chain ? chain.explorers : RootExplorers;

  return (
    <div className={cnTw('max-h-full flex flex-col flex-1')}>
      <SmallTitleText className="py-2 mb-4">{t('createMultisigAccount.selectedSignatoriesTitle')}</SmallTitleText>

      <div className="flex flex-col gap-y-2 flex-1 overflow-y-auto">
        {wallets.length > 0 && (
          <>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.walletsTab')} <span className="ml-2">{wallets.length}</span>
            </FootnoteText>
            <ul className="flex flex-col gap-y-2">
              {wallets.map(({ index, name, type }) => (
                <li key={index} className="py-1.5 px-1 rounded-md hover:bg-action-background-hover">
                  <WalletItem name={name} type={type || WalletType.POLKADOT_VAULT} />
                </li>
              ))}
            </ul>
          </>
        )}

        {accounts.length > 0 && (
          <>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.yourAccounts')} <span className="ml-2">{accounts.length}</span>
            </FootnoteText>
            <ul className="flex flex-col gap-y-2">
              {accounts.map(({ index, name, accountId }) => (
                <li key={index} className="py-1.5 px-1 rounded-md hover:bg-action-background-hover">
                  <ExplorersPopover
                    address={accountId}
                    explorers={explorers}
                    button={<ContactItem name={name} address={accountId} />}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {contacts.length > 0 && (
          <>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.contactsTab')} <span className="ml-2">{contacts.length}</span>
            </FootnoteText>
            <ul className="gap-y-2">
              {contacts.map(({ index, accountId, name, matrixId }) => (
                <li key={index} className="p-1 rounded-md hover:bg-action-background-hover">
                  <ExplorersPopover
                    address={accountId}
                    explorers={explorers}
                    button={<ContactItem name={name} address={accountId} />}
                  >
                    <ExplorersPopover.Group active={Boolean(matrixId)} title={t('general.explorers.matrixIdTitle')}>
                      <HelpText className="text-text-secondary break-all">{matrixId}</HelpText>
                    </ExplorersPopover.Group>
                  </ExplorersPopover>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
