import { cnTw, RootExplorers } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { FootnoteText, SmallTitleText, HelpText } from '@shared/ui';
import { ExtendedWallet, ExtendedContact } from '../common/types';
import { WalletItem } from './WalletItem';
import { ContactItem, ExplorersPopover } from '@entities/wallet';
import { WalletType } from '@shared/core';

type Props = {
  isActive: boolean;
  wallets: ExtendedWallet[];
  contacts: ExtendedContact[];
};

export const ConfirmSignatories = ({ isActive, wallets, contacts }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw(!isActive && 'hidden')}>
      <SmallTitleText className="py-2 mb-4">{t('createMultisigAccount.selectedSignatoriesTitle')}</SmallTitleText>

      <div className="flex flex-col gap-y-2 flex-1 overflow-y-auto">
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
                    explorers={RootExplorers}
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
