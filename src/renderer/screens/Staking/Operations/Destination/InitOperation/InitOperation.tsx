import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Select, MultiSelect, FootnoteText, InputHint, Tooltip } from '@renderer/components/ui-redesign';
import { Fee, Deposit } from '@renderer/components/common';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { Balance as AccountBalance } from '@renderer/domain/balance';
import { Account, isMultisig } from '@renderer/domain/account';
import { toAddress } from '@renderer/shared/utils/address';
import { nonNullable } from '@renderer/shared/utils/functions';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import { OperationForm } from '../../components';
import { Icon } from '@renderer/components/ui';
import {
  getSignatoryOptions,
  validateBalanceForFeeDeposit,
  validateBalanceForFee,
  getGeneralAccountOption,
} from '../../common/utils';

export type DestinationResult = {
  accounts: Account[];
  destination: Address;
  signer?: Account;
  description?: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  accounts: Account[];
  addressPrefix: number;
  asset: Asset;
  onResult: (data: DestinationResult) => void;
};

const InitOperation = ({ api, chainId, accounts, addressPrefix, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();
  const { getLiveAssetBalances } = useBalance();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [deposit, setDeposit] = useState('');

  const [destAccounts, setDestAccounts] = useState<DropdownOption<Account>[]>([]);
  const [activeDestAccounts, setActiveDestAccounts] = useState<DropdownResult<Account>[]>([]);

  const [activeSignatory, setActiveSignatory] = useState<DropdownResult<Account>>();
  const [signatoryOptions, setSignatoryOptions] = useState<DropdownOption<Account>[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBalances, setActiveBalances] = useState<AccountBalance[]>([]);

  const firstAccount = activeDestAccounts[0]?.value;
  const accountIsMultisig = isMultisig(firstAccount);
  const formFields = accountIsMultisig ? [{ name: 'destination' }, { name: 'description' }] : [{ name: 'destination' }];

  const accountIds = accounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const signatoryIds = accountIsMultisig ? firstAccount.signatories.map((s) => s.accountId) : [];
  const signatoriesBalances = getLiveAssetBalances(signatoryIds, chainId, asset.assetId.toString());
  const signerBalance = signatoriesBalances.find((b) => b.accountId === activeSignatory?.value.accountId);

  useEffect(() => {
    const balancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeDestAccounts
      .map((a) => balancesMap.get(a.id as AccountId))
      .filter(nonNullable) as AccountBalance[];

    setActiveBalances(newActiveBalances);
  }, [activeDestAccounts.length, balances]);

  useEffect(() => {
    const formattedAccounts = accounts.map((account) => {
      const balance = balances.find((b) => b.accountId === account.accountId);

      return getGeneralAccountOption(account, { asset, fee, balance, addressPrefix });
    });

    if (formattedAccounts.length === 0) return;

    setDestAccounts(formattedAccounts);
  }, [fee, balances, accounts.length]);

  useEffect(() => {
    if (!accountIsMultisig) return;

    const signerOptions = dbAccounts.reduce<DropdownOption<Account>[]>((acc, signer) => {
      const isWatchOnly = signer.signingType === SigningType.WATCH_ONLY;
      const signerExist = signatoryIds.includes(signer.accountId);
      if (!isWatchOnly && signerExist) {
        const balance = signatoriesBalances.find((b) => b.accountId === signer.accountId);

        acc.push(getSignatoryOptions(signer, { addressPrefix, asset, balance }));
      }

      return acc;
    }, []);

    if (signerOptions.length === 0) return;

    setSignatoryOptions(signerOptions);
    setActiveSignatory({ id: signerOptions[0].id, value: signerOptions[0].value });
  }, [accountIsMultisig, dbAccounts.length, signatoriesBalances.length]);

  useEffect(() => {
    if (destAccounts.length === 0) return;

    const activeAccounts = destAccounts.map(({ id, value }) => ({ id, value }));
    setActiveDestAccounts(activeAccounts);
  }, [destAccounts.length]);

  useEffect(() => {
    const newTransactions = activeDestAccounts.map(({ value }) => ({
      chainId,
      address: toAddress(value.accountId, { prefix: addressPrefix }),
      type: TransactionType.DESTINATION,
      args: { payee: { Account: TEST_ADDRESS } },
    }));

    setTransactions(newTransactions);
  }, [activeDestAccounts.length]);

  const submitDestination = (data: { destination?: string; description?: string }) => {
    const selectedAccountIds = activeDestAccounts.map((stake) => stake.id);
    const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.accountId));

    onResult({
      accounts: selectedAccounts,
      destination: data.destination || '',
      ...(accountIsMultisig && {
        description:
          data.description ||
          t('transactionMessage.destination', {
            address: data.destination || t('transactionMessage.restakeDestination'),
          }),
        signer: activeSignatory?.value,
      }),
    });
  };

  const validateFee = (): boolean => {
    if (!accountIsMultisig) {
      return activeBalances.every((b) => validateBalanceForFee(b, fee));
    }

    if (!signerBalance) return false;

    return validateBalanceForFee(signerBalance, fee);
  };

  const validateDeposit = (): boolean => {
    if (!accountIsMultisig) return true;
    if (!signerBalance) return false;

    return validateBalanceForFeeDeposit(signerBalance, deposit, fee);
  };

  const canSubmit = !feeLoading && (activeDestAccounts.length > 0 || Boolean(activeSignatory));

  return (
    <div className="flex flex-col gap-y-4 w-[440px] px-5 py-4">
      {accountIsMultisig ? (
        <div className="flex flex-col gap-y-2">
          <Select
            label={t('staking.bond.signatoryLabel')}
            placeholder={t('staking.bond.signatoryPlaceholder')}
            disabled={!signatoryOptions.length}
            selectedId={activeSignatory?.id}
            options={signatoryOptions}
            onChange={setActiveSignatory}
          />
          <InputHint active={!signatoryOptions.length}>{t('multisigOperations.noSignatory')}</InputHint>
        </div>
      ) : (
        <MultiSelect
          label={t('staking.bond.accountLabel')}
          placeholder={t('staking.bond.accountPlaceholder')}
          multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
          selectedIds={activeDestAccounts.map((acc) => acc.id)}
          options={destAccounts}
          onChange={setActiveDestAccounts}
        />
      )}

      <OperationForm
        chainId={chainId}
        canSubmit={canSubmit}
        addressPrefix={addressPrefix}
        fields={formFields}
        asset={asset}
        validateFee={validateFee}
        validateDeposit={validateDeposit}
        onSubmit={submitDestination}
      >
        <div className="flex flex-col gap-y-2">
          {accountIsMultisig && (
            <div className="flex justify-between items-center gap-x-2">
              <div className="flex items-center gap-x-1">
                <Icon className="text-text-tertiary" name="lock" size={12} />
                <FootnoteText className="text-text-tertiary">{t('staking.bond.networkDepositLabel')}</FootnoteText>
                <Tooltip content={t('staking.tooltips.depositDescription')} pointer="up">
                  <Icon name="info" className="cursor-pointer" size={16} />
                </Tooltip>
              </div>
              <FootnoteText>
                <Deposit api={api} asset={asset} threshold={firstAccount.threshold} onDepositChange={setDeposit} />
              </FootnoteText>
            </div>
          )}

          <div className="flex justify-between items-center gap-x-2">
            <FootnoteText className="text-text-tertiary">{t('staking.bond.networkFeeLabel')}</FootnoteText>
            <FootnoteText className="text-text-tertiary">
              <Fee
                api={api}
                asset={asset}
                transaction={transactions[0]}
                onFeeChange={setFee}
                onFeeLoading={setFeeLoading}
              />
            </FootnoteText>
          </div>
        </div>
      </OperationForm>
    </div>
  );
};

export default InitOperation;
