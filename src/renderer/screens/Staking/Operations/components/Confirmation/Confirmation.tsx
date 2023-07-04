import { BN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { PropsWithChildren, useState, useEffect } from 'react';

import { Icon } from '@renderer/components/ui';
import { Button, FootnoteText, CaptionText, InputHint, Tooltip } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { useToggle } from '@renderer/shared/hooks';
import { Deposit, BalanceNew, Fee } from '@renderer/components/common';
import { RewardsDestination } from '@renderer/domain/stake';
import { Validator } from '@renderer/domain/validator';
import { Account } from '@renderer/domain/account';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Transaction, MultisigTxInitStatus } from '@renderer/domain/transaction';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import AccountsModal from '../Modals/AccountsModal/AccountsModal';
import ValidatorsModal from '../Modals/ValidatorsModal/ValidatorsModal';
import { DestinationType } from '../../common/types';
import cnTw from '@renderer/shared/utils/twMerge';
import { useMultisigTx } from '@renderer/services/multisigTx/multisigTxService';

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
  description,
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
  const { getMultisigTxs } = useMultisigTx();

  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const [feeLoading, setFeeLoading] = useState(true);
  const [multisigTxExist, setMultisigTxExist] = useState(false);

  const singleAccount = accounts.length === 1;
  const validatorsExist = validators && validators.length > 0;
  const totalAmount = amounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const threshold = multisigTx?.args.threshold;

  useEffect(() => {
    if (!multisigTx) return;

    getMultisigTxs({
      chainId: multisigTx.chainId,
      accountId: accounts[0].accountId,
      callHash: multisigTx.args.callHash,
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
          {amounts.length > 0 && (
            <BalanceNew className="block mx-auto text-center text-4xl font-bold" value={totalAmount} asset={asset} />
          )}

          {description && (
            <FootnoteText className="py-2 px-3 rounded bg-block-background text-text-secondary text-center">
              {description}
            </FootnoteText>
          )}
        </div>

        {/* TODO: use DetailRow */}
        <div className="flex flex-col gap-y-4">
          <div className="flex justify-between items-center gap-x-2">
            <FootnoteText className="text-text-tertiary">
              {t('staking.confirmation.accountLabel', { count: accounts.length })}
            </FootnoteText>
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
                  <CaptionText className="text-white">{accounts.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
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
                  <CaptionText className="text-white">{validators.length}</CaptionText>
                </div>
                <Icon className="group-hover:text-icon-hover" name="info" size={16} />
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
              <div className="flex items-center gap-x-1">
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('staking.networkDepositLabel')}</FootnoteText>
                <Tooltip content={t('staking.tooltips.depositDescription')} pointer="up">
                  <Icon name="info" className="cursor-pointer" size={16} />
                </Tooltip>
              </div>
              <FootnoteText>
                <Deposit api={api} asset={asset} threshold={threshold} />
              </FootnoteText>
            </div>
          )}

          <div className="flex justify-between items-center gap-x-2">
            <FootnoteText className="text-text-tertiary">
              {t('staking.networkFee', { count: accounts.length })}
            </FootnoteText>
            <FootnoteText>
              <Fee api={api} asset={asset} transaction={transaction} onFeeLoading={setFeeLoading} />
            </FootnoteText>
          </div>

          {accounts.length > 1 && (
            <div className="flex justify-between items-center gap-x-2">
              <FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>
              <FootnoteText className="text-text-tertiary">
                <Fee
                  api={api}
                  asset={asset}
                  multiply={accounts.length}
                  transaction={transaction}
                  onFeeLoading={setFeeLoading}
                />
              </FootnoteText>
            </div>
          )}

          <InputHint active={multisigTxExist} variant="error">
            {t('staking.confirmation.hintMstExists')}
          </InputHint>

          {children}
        </div>

        <div className="flex justify-between items-center mt-7">
          <Button variant="text" onClick={onGoBack}>
            {t('staking.confirmation.backButton')}
          </Button>
          <Button
            disabled={feeLoading || multisigTxExist}
            prefixElement={<Icon name="vault" size={14} />}
            onClick={onResult}
          >
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
