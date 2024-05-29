import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { cnTw, RootExplorers, toAddress } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BodyText, Button, FootnoteText, Select, SmallTitleText } from '@shared/ui';
import { ExtendedWallet, ExtendedContact, ExtendedAccount } from '../common/types';
import { WalletItem } from './WalletItem';
import { AccountAddress, ContactItem, ExplorersPopover, walletModel, walletUtils } from '@entities/wallet';
import { Chain, WalletType } from '@shared/core';
import { flowModel } from '../../../model/flow-model';
import { Step } from '../../../lib/types';
import { formModel } from '../../../model/form-model';
import { FeeWithLabel, MultisigDepositWithLabel } from '@entities/transaction';
import { SignButton } from '@entities/operations';
import { confirmModel } from '../../../model/confirm-model';

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
  const accountSignatories = useUnit(formModel.$accountSignatories);
  const signatories = useUnit(formModel.$signatories);
  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);
  const signerWallet = useUnit(flowModel.$signerWallet);

  const explorers = chain ? chain.explorers : RootExplorers;

  return (
    <div className={cnTw('max-h-full flex flex-col flex-1')}>
      {accountSignatories.length > 1 && (
        <>
          <SmallTitleText className="py-2">{t('createMultisigAccount.signingWith')}</SmallTitleText>
          <AccountSelector chain={chain} />
        </>
      )}

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
      </div>
      <div className="flex flex-col gap-y-2 my-2 flex-1">
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
        <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.NAMETHRESHOLD)}>
          {t('createMultisigAccount.backButton')}
        </Button>
        <SignButton type={signerWallet!.type} onClick={confirmModel.output.formSubmitted} />
      </div>
    </div>
  );
};

const AccountSelector = ({ chain }: { chain?: Chain }) => {
  const { t } = useI18n();

  const selectedSigner = useUnit(flowModel.$selectedSigner);
  const accountSignatories = useUnit(formModel.$accountSignatories);
  const wallets = useUnit(walletModel.$wallets);
  // const proxiedAccounts = useUnit(formModel.$proxiedAccounts);

  if (!chain) return null;

  const options = accountSignatories.map(({ accountId, name }) => {
    //   const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(accountId, { prefix: chain.addressPrefix });

    return {
      id: accountId,
      value: accountId,
      element: (
        <div className="flex justify-between w-full" key={accountId}>
          <AccountAddress size={20} type="short" address={address} name={name} canCopy={false} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('proxy.addProxy.accountLabel')}
        placeholder={t('proxy.addProxy.accountPlaceholder')}
        selectedId={selectedSigner?.accountId}
        options={options}
        disabled={options.length === 1}
        onChange={({ value }) => {
          const selected = walletUtils.getAccountsBy(wallets, (account) => account.accountId === value)[0];

          flowModel.events.selectedSignerChanged(selected!);
        }}
      />
    </div>
  );
};
