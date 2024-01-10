import { BN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { PropsWithChildren, useState, useEffect } from 'react';
import { useUnit } from 'effector-react';

import { Icon, Button, FootnoteText, CaptionText, InputHint, DetailRow } from '@shared/ui';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { Validator } from '@shared/core/types/validator';
import { AddressWithExplorers, WalletCardSm, WalletIcon, accountUtils, walletModel } from '@entities/wallet';
import { AssetBalance } from '@entities/asset';
import { MultisigTxInitStatus, DepositWithLabel, Fee, useTransaction, Transaction } from '@entities/transaction';
import AccountsModal from '../Modals/AccountsModal/AccountsModal';
import { DestinationType } from '../../common/types';
import { cnTw } from '@shared/lib/utils';
import { useMultisigTx } from '@entities/multisig';
import { RewardsDestination, WalletType } from '@shared/core';
import type { Account, Asset, Explorer } from '@shared/core';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { SelectedValidatorsModal } from '@entities/staking';
import { SignButton } from '@entities/operation/ui/SignButton';
import { getIconName } from '@entities/transaction/lib/transactionIcon';

const ActionStyle = 'group hover:bg-action-background-hover px-2 py-1 rounded';

type Props = {
  api: ApiPromise;
  validators?: Validator[];
  accounts: Account[];
  signer?: Account;
  amounts?: string[];
  destination?: DestinationType;
  description?: string;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  transaction: Transaction;
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
  description,
  asset,
  explorers,
  addressPrefix,
  transaction,
  children,
  onResult,
  onGoBack,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const { getMultisigTxs } = useMultisigTx({});
  const { getTransactionHash } = useTransaction();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);

  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const [feeLoading, setFeeLoading] = useState(true);
  const [multisigTxExist, setMultisigTxExist] = useState(false);

  const isMultisigAccount = accountUtils.isMultisigAccount(accounts[0]);
  const singleAccount = accounts.length === 1;
  const validatorsExist = validators && validators.length > 0;
  const totalAmount = amounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const signerWallet = signer && wallets.find((w) => w.id === signer.walletId);
  const walletType = signerWallet?.type || activeWallet?.type || WalletType.POLKADOT_VAULT;

  useEffect(() => {
    if (!accounts.length && !isMultisigAccount) return;

    const { callHash } = getTransactionHash(transaction, api);

    getMultisigTxs({
      chainId: transaction.chainId,
      accountId: accounts[0].accountId,
      callHash: callHash,
      status: MultisigTxInitStatus.SIGNING,
    })
      .then((txs) => setMultisigTxExist(Boolean(txs.length)))
      .catch(() => {
        console.warn('Could not retrieve multisig transactions from DB');
      });
  }, []);

  return (
    <>
      <div className="w-[440px] px-5 py-4">
        <div className="flex flex-col items-center gap-y-3 mb-6">
          <div className="flex items-center justify-center w-15 h-15 box-content rounded-full border-2 border-icon-default">
            <Icon className="text-icon-default" name={getIconName(transaction)} size={42} />
          </div>
          {amounts.length > 0 && (
            <div className="flex flex-col gap-y-2 items-center mx-auto">
              <AssetBalance
                value={totalAmount}
                asset={asset}
                className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
              />
              <AssetFiatBalance asset={asset} amount={totalAmount} className="text-headline" />
            </div>
          )}

          {description && (
            <FootnoteText className="py-2 px-3 rounded bg-block-background text-text-secondary text-center">
              {description}
            </FootnoteText>
          )}
        </div>

        <div className="flex flex-col gap-y-4">
          {activeWallet && (
            <DetailRow label={t('operation.details.wallet')} className="flex gap-x-2">
              <WalletIcon type={activeWallet.type} size={16} />
              <FootnoteText className="pr-2">{activeWallet.name}</FootnoteText>
            </DetailRow>
          )}
          <DetailRow label={t('staking.confirmation.accountLabel', { count: accounts.length })}>
            {singleAccount ? (
              <AddressWithExplorers
                type="short"
                wrapperClassName="text-text-secondary"
                accountId={accounts[0].accountId}
                explorers={explorers}
                addressPrefix={addressPrefix}
              />
            ) : (
              <button type="button" className={cnTw('flex items-center gap-x-1', ActionStyle)} onClick={toggleAccounts}>
                <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                  <CaptionText className="text-white">{accounts.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </button>
            )}
          </DetailRow>

          {signerWallet && (
            <DetailRow className="flex gap-x-2" label={t('staking.confirmation.signatoryLabel')}>
              <WalletCardSm
                wallet={signerWallet}
                accountId={signer.accountId}
                addressPrefix={addressPrefix}
                explorers={explorers}
              />
            </DetailRow>
          )}

          {validatorsExist && (
            <DetailRow label={t('staking.confirmation.validatorsLabel')}>
              <button
                type="button"
                className={cnTw('flex items-center gap-x-1', ActionStyle)}
                onClick={toggleValidators}
              >
                <div className="rounded-[30px] px-1.5 py-[1px] bg-icon-accent">
                  <CaptionText className="text-white">{validators.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
              </button>
            </DetailRow>
          )}

          {destination && (
            <>
              <hr className="border-filter-border w-full" />
              <DetailRow label={t('staking.confirmation.rewardsDestinationLabel')}>
                <>
                  {destination?.type === RewardsDestination.RESTAKE && (
                    <FootnoteText>{t('staking.confirmation.restakeRewards')}</FootnoteText>
                  )}
                  {destination?.type === RewardsDestination.TRANSFERABLE && destination.address && (
                    <AddressWithExplorers address={destination.address} explorers={explorers} type="short" />
                  )}
                </>
              </DetailRow>
              {children}
            </>
          )}

          <hr className="border-filter-border" />

          {accountUtils.isMultisigAccount(accounts[0]) && (
            <DepositWithLabel api={api} asset={asset} threshold={accounts[0].threshold} />
          )}
          <DetailRow label={t('staking.networkFee', { count: accounts.length })}>
            <Fee api={api} asset={asset} transaction={transaction} onFeeLoading={setFeeLoading} />
          </DetailRow>

          {accounts.length > 1 && (
            <DetailRow label={t('staking.networkFeeTotal')}>
              <Fee
                api={api}
                asset={asset}
                multiply={accounts.length}
                transaction={transaction}
                onFeeLoading={setFeeLoading}
              />
            </DetailRow>
          )}

          {!destination && children}

          <InputHint active={multisigTxExist} variant="error">
            {t('staking.confirmation.hintMstExists')}
          </InputHint>
        </div>

        <div className="flex justify-between items-center mt-7">
          <Button variant="text" onClick={onGoBack}>
            {t('staking.confirmation.backButton')}
          </Button>
          <SignButton disabled={feeLoading || multisigTxExist} type={walletType} onClick={onResult} />
        </div>
      </div>

      <AccountsModal
        isOpen={isAccountsOpen}
        accounts={accounts}
        amounts={amounts}
        chainId={transaction?.chainId}
        asset={asset}
        explorers={explorers}
        addressPrefix={addressPrefix}
        onClose={toggleAccounts}
      />

      {validatorsExist && (
        <SelectedValidatorsModal
          isOpen={isValidatorsOpen}
          validators={validators}
          explorers={explorers}
          onClose={toggleValidators}
        />
      )}
    </>
  );
};
