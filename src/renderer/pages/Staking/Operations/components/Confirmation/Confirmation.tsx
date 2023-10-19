import { BN, BN_ZERO } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';
import { PropsWithChildren, useState, useEffect } from 'react';

import { Icon, Button, FootnoteText, CaptionText, InputHint } from '@renderer/shared/ui';
import { useI18n, useNetworkContext } from '@renderer/app/providers';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Validator } from '@renderer/shared/core/types/validator';
import { AddressWithExplorers, accountUtils } from '@renderer/entities/wallet';
import { AssetBalance } from '@renderer/entities/asset';
import {
  MultisigTxInitStatus,
  DepositWithLabel,
  Fee,
  useTransaction,
  Transaction,
} from '@renderer/entities/transaction';
import AccountsModal from '../Modals/AccountsModal/AccountsModal';
import ValidatorsModal from '../Modals/ValidatorsModal/ValidatorsModal';
import { DestinationType } from '../../common/types';
import { cnTw } from '@renderer/shared/lib/utils';
import { useMultisigTx } from '@renderer/entities/multisig';
import { RewardsDestination } from '@renderer/shared/core';
import type { Account, Asset, Explorer } from '@renderer/shared/core';
import { AssetFiatBalance } from '@renderer/entities/price/ui/AssetFiatBalance';
import { useValidatorsMap } from '@renderer/entities/staking';
import { isLightClient } from '@renderer/entities/network';

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
  const { connections } = useNetworkContext();

  const chainId = transaction.chainId;
  const connection = connections[chainId];

  const allValidators = Object.values(useValidatorsMap(api, chainId, connection && isLightClient(connection)));

  const [isAccountsOpen, toggleAccounts] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const [feeLoading, setFeeLoading] = useState(true);
  const [multisigTxExist, setMultisigTxExist] = useState(false);

  const isMultisigAccount = accountUtils.isMultisigAccount(accounts[0]);
  const singleAccount = accounts.length === 1;
  const validatorsExist = validators && validators.length > 0;
  const totalAmount = amounts.reduce((acc, amount) => acc.add(new BN(amount)), BN_ZERO).toString();

  const selectedValidatorsAddress = validators?.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress?.includes(v.address));

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
          {amounts.length > 0 && (
            <div className="flex flex-col gap-y-1 items-center mx-auto">
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

          {accountUtils.isMultisigAccount(accounts[0]) && (
            <DepositWithLabel api={api} asset={asset} threshold={accounts[0].threshold} />
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
          asset={asset}
          selectedValidators={validators}
          notSelectedValidators={notSelectedValidators}
          explorers={explorers}
          onClose={toggleValidators}
        />
      )}
    </>
  );
};
