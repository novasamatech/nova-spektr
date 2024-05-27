import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { cnTw, RootExplorers } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BodyText, Button, FootnoteText, SmallTitleText } from '@shared/ui';
import { ExtendedWallet, ExtendedContact, ExtendedAccount } from '../common/types';
import { WalletItem } from './WalletItem';
import { ContactItem, ExplorersPopover } from '@entities/wallet';
import { Chain, WalletType } from '@shared/core';
import { flowModel } from '../../../model/create-multisig-flow-model';
import { Step } from '../../../lib/types';
import { formModel } from '../../../model/create-multisig-form-model';
import { FeeWithLabel, MultisigDepositWithLabel } from '@entities/transaction';

type Props = {
  wallets?: ExtendedWallet[];
  accounts?: ExtendedAccount[];
  contacts: ExtendedContact[];
  chain?: Chain;
};

export const ConfirmationStep = ({ chain, wallets = [], accounts = [], contacts }: Props) => {
  const { t } = useI18n();
  const {
    fields: { name, threshold },
  } = useForm(formModel.$createMultisigForm);
  const signatories = useUnit(formModel.$signatories);
  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);

  const explorers = chain ? chain.explorers : RootExplorers;

  return (
    <div className={cnTw('max-h-full flex flex-col flex-1')}>
      <SmallTitleText className="py-2">{t('createMultisigAccount.newMultisigTitle')}</SmallTitleText>
      <WalletItem className="py-2 mb-4" name={name.value} type={WalletType.MULTISIG} />

      <SmallTitleText className="py-2">{t('createMultisigAccount.thresholdName')}</SmallTitleText>
      <BodyText as="span" className="text-text-secondary tracking-tight truncate mb-4">
        {threshold.value}/{signatories.length}
      </BodyText>

      <SmallTitleText className="py-2">{t('createMultisigAccount.selectedSignatoriesTitle')}</SmallTitleText>
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
              {contacts.map(({ index, accountId, name }) => (
                <li key={index} className="p-1 rounded-md hover:bg-action-background-hover">
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

        <MultisigDepositWithLabel
          api={api}
          asset={chain!.assets[0]}
          threshold={threshold.value}
          onDepositChange={flowModel.events.multisigDepositChanged}
        />
        <FeeWithLabel
          api={api}
          asset={chain!.assets[0]}
          transaction={fakeTx}
          onFeeChange={flowModel.events.feeChanged}
          onFeeLoading={flowModel.events.isFeeLoadingChanged}
        />
      </div>
      <div className="flex justify-between items-center mt-auto">
        <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.INIT)}>
          {t('createMultisigAccount.backButton')}
        </Button>
        <Button key="continue" onClick={() => flowModel.events.stepChanged(Step.SIGN)}>
          {t('createMultisigAccount.continueButton')}
        </Button>
      </div>
    </div>
  );
};
