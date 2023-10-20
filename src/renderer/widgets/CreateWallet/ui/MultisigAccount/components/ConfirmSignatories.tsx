import { cnTw } from '@renderer/shared/lib/utils';
import { useI18n } from '@renderer/app/providers';
import { FootnoteText, SmallTitleText } from '@renderer/shared/ui';
import { ExtendedWallet, ExtendedContact } from '../common/types';
import { WalletItem } from './WalletItem';
import { ContactItem } from '@renderer/entities/wallet';
import { WalletType } from '@renderer/shared/core';

type Props = {
  isActive: boolean;
  wallets: ExtendedWallet[];
  contacts: ExtendedContact[];
};

export const ConfirmSignatories = ({ isActive, wallets, contacts }: Props) => {
  const { t } = useI18n();

  return (
    <section
      className={cnTw('flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full', !isActive && 'hidden')}
    >
      <SmallTitleText className="py-2 mb-4">{t('createMultisigAccount.selectedSignatoriesTitle')}</SmallTitleText>

      <div className="flex flex-col gap-y-2 flex-1 overflow-y-auto">
        <FootnoteText className="text-text-tertiary">
          {t('createMultisigAccount.walletsTab')} <span className="ml-2">{wallets.length}</span>
        </FootnoteText>
        <ul className="gap-y-2">
          {wallets.map(({ index, name, type }) => (
            <li key={index} className="p-1 mb-0.5 last:mb-0 rounded-md hover:bg-action-background-hover">
              <WalletItem name={name} type={type || WalletType.POLKADOT_VAULT} />
            </li>
          ))}
        </ul>

        {contacts.length > 0 && (
          <>
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.contactsTab')} <span className="ml-2">{contacts.length}</span>
            </FootnoteText>
            <ul className="gap-y-2">
              {contacts.map(({ index, accountId, name }) => (
                <li key={index} className="p-1 mb-0.5 last:mb-0 rounded-md hover:bg-action-background-hover">
                  <ContactItem name={name} accountId={accountId} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
