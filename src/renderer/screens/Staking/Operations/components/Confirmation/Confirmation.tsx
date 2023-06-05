import { BN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { PropsWithChildren } from 'react';

import { Icon } from '@renderer/components/ui';
import { Button, FootnoteText, CaptionText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import { Deposit, BalanceNew, Fee } from '@renderer/components/common';
import { RewardsDestination } from '@renderer/domain/stake';
import { Validator } from '@renderer/domain/validator';
import { Account } from '@renderer/domain/account';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Transaction } from '@renderer/domain/transaction';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import AccountsModal from '../Modals/AccountsModal/AccountsModal';
import ValidatorsModal from '../Modals/ValidatorsModal/ValidatorsModal';
import cnTw from '@renderer/shared/utils/twMerge';
import { DestinationType } from '../../common/types';

const ActionStyle = 'group hover:bg-action-background-hover px-2 py-1 rounded';

type Props = {
  api: ApiPromise;
  validators?: Validator[];
  accounts: Account[];
  signer?: Account;
  amounts?: string[];
  destination?: DestinationType;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  transaction: Transaction;
  multisigTx?: Transaction;
  onResult: () => void;
  onGoBack: () => void;
};

export const Confirmation = ({
  api,
  validators,
  accounts,
  signer,
  amounts = [],
  destination,
  asset,
  explorers,
  addressPrefix,
  transaction,
  multisigTx,
  children,
  onResult,
  onGoBack,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const singleAccount = accounts.length === 1;
  const validatorsExist = validators && validators.length > 0;
  const totalAmount = amounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const threshold = multisigTx?.args.threshold;

  return (
    <>
      <div className="w-[440px] px-5 py-4">
        {amounts.length > 0 && (
          <BalanceNew
            className="block mt-4 mb-6 mx-auto text-center text-4xl font-bold"
            value={totalAmount}
            asset={asset}
          />
        )}

        <div className="flex flex-col gap-y-4">
          <div className="flex justify-between items-center gap-x-2">
            {signer ? (
              <FootnoteText className="text-text-tertiary">{t('staking.confirmation.walletLabel')}</FootnoteText>
            ) : (
              <FootnoteText className="text-text-tertiary">{t('staking.confirmation.accountLabel')}</FootnoteText>
            )}
            {singleAccount ? (
              <AddressWithExplorers
                accountId={accounts[0].accountId}
                name={accounts[0].name}
                explorers={explorers}
                addressPrefix={addressPrefix}
              />
            ) : (
              <button type="button" className={cnTw('flex items-center gap-x-1', ActionStyle)} onClick={toggleAccounts}>
                <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                  <CaptionText className="text-button-text">{accounts.length}</CaptionText>
                </div>
                <Icon className="text-icon-default group-hover:text-icon-hover" name="info" size={16} />
              </button>
            )}
          </div>

          {signer && (
            <div className="flex justify-between items-center gap-x-2">
              <FootnoteText className="text-text-tertiary">{t('staking.confirmation.signatoryLabel')}</FootnoteText>
              <AddressWithExplorers
                accountId={signer.accountId}
                name={signer.name}
                explorers={explorers}
                addressPrefix={addressPrefix}
              />
            </div>
          )}

          {validatorsExist && (
            <div className="flex justify-between items-center gap-x-2">
              <FootnoteText className="text-text-tertiary">{t('staking.confirmation.validatorsLabel')}</FootnoteText>
              <button
                type="button"
                className={cnTw('flex items-center gap-x-1', ActionStyle)}
                onClick={toggleValidators}
              >
                <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                  <CaptionText className="text-button-text">{validators.length}</CaptionText>
                </div>
                <Icon className="text-icon-default group-hover:text-icon-hover" name="info" size={16} />
              </button>
            </div>
          )}

          <hr className="border-divider w-full" />

          {destination && (
            <>
              <div className="flex justify-between items-center gap-x-2">
                <FootnoteText className="text-text-tertiary">
                  {t('staking.confirmation.rewardsDestinationLabel')}
                </FootnoteText>
                {destination?.type === RewardsDestination.RESTAKE && (
                  <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
                )}
                {destination?.type === RewardsDestination.TRANSFERABLE && destination.address && (
                  <AddressWithExplorers address={destination.address} explorers={explorers} type="short" />
                )}
              </div>

              <hr className="border-divider w-full" />
            </>
          )}

          {multisigTx && (
            <div className="flex justify-between items-center gap-x-2">
              <div className="flex items-center gap-x-2">
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">
                  {t('staking.confirmation.networkDepositLabel')}
                </FootnoteText>
              </div>
              <FootnoteText>
                <Deposit api={api} asset={asset} threshold={threshold} />
              </FootnoteText>
            </div>
          )}

          <div className="flex justify-between items-center gap-x-2">
            <FootnoteText className="text-text-tertiary">{t('staking.confirmation.networkFeeLabel')}</FootnoteText>
            <FootnoteText>
              <Fee api={api} multiply={accounts.length} asset={asset} transaction={transaction} />
            </FootnoteText>
          </div>

          {children}
        </div>

        <div className="flex justify-between items-center mt-7">
          <Button variant="text" onClick={onGoBack}>
            {t('staking.confirmation.backButton')}
          </Button>
          <Button prefixElement={<Icon name="vault" size={14} />} onClick={onResult}>
            {t('staking.confirmation.signButton')}
          </Button>
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={accounts}
        amounts={amounts}
        asset={asset}
        explorers={explorers}
        addressPrefix={addressPrefix}
        onClose={toggleAccounts}
      />

      {validatorsExist && (
        <ValidatorsModal
          isOpen={isValidatorsOpen}
          validators={validators}
          explorers={explorers}
          onClose={toggleValidators}
        />
      )}
    </>
  );
};
