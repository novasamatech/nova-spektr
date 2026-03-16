import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, InputHint, MultiSelect } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { priceProviderModel } from '@/domains/price';
import { AccountAddress, ProxyWalletAlert, accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AmountInput } from '@/features/assets-balances';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeLoader } from '@/widgets/transaction-fee';
import { formModelShards } from '../model/form-model-shards';

type Props = {
  onGoBack: () => void;
};

export const BondFormShards = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModelShards.$bondForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <AccountsSelector />
        <Amount />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { shards },
  } = useForm(formModelShards.$bondForm);

  const feeData = useUnit(formModelShards.$feeData);
  const balance = useUnit(formModelShards.$proxyBalance);
  const network = useUnit(formModelShards.$networkStore);
  const proxyWallet = useUnit(formModelShards.$proxyWallet);

  if (!network || !proxyWallet || !shards.hasError()) {
    return null;
  }

  const formattedFee = formatBalance(feeData.fee, network.asset.precision).value;
  const formattedBalance = formatBalance(balance, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={shards.resetErrors}
    />
  );
};

const AccountsSelector = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(formModelShards.$bondForm);

  const accounts = useUnit(formModelShards.$accounts);
  const network = useUnit(formModelShards.$networkStore);
  const wallet = useUnit(walletSelect.$selectedWallet);

  if (!network || accounts.length <= 1 || walletUtils.isFlexibleMultisig(wallet)) {
    return null;
  }

  const options = accounts.map(({ account, balance }) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: account,
      element: (
        <div className="flex w-full justify-between" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 16) : account.name}
            canCopy={false}
          />
          <AssetBalance value={balance} asset={network.asset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <MultiSelect
        label={t('staking.bond.accountLabel')}
        placeholder={t('staking.bond.accountPlaceholder')}
        multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
        invalid={shards.hasError()}
        selectedIds={shards.value.map((acc) => acc.id.toString())}
        options={options}
        onChange={(values) => shards.onChange(values.map(({ value }) => value))}
      />
      <InputHint variant="error" active={shards.hasError()}>
        {t(shards.errorText())}
      </InputHint>
    </div>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModelShards.$bondForm);

  const network = useUnit(formModelShards.$networkStore);
  const bondBalanceRange = useUnit(formModelShards.$bondBalanceRange);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={bondBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError()} variant="error">
        {t(amount.errorText())}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(formModelShards.$bondForm);

  const network = useUnit(formModelShards.$networkStore);
  const feeData = useUnit(formModelShards.$feeData);
  const isFeeLoading = useUnit(formModelShards.$isFeeLoading);
  const isMultisig = useUnit(formModelShards.$isMultisig);

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!network || shards.value.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <DetailRow
          className="text-text-primary"
          label={
            <>
              <Icon className="text-text-tertiary" name="lock" size={12} />
              <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
              <Tooltip>
                <Tooltip.Trigger>
                  <div tabIndex={0}>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('staking.tooltips.depositDescription')}</Tooltip.Content>
              </Tooltip>
            </>
          }
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={feeData.multisigDeposit} asset={network.asset} />
            <AssetFiatBalance asset={network.asset} amount={feeData.multisigDeposit} />
          </div>
        </DetailRow>
      )}

      <DetailRow
        label={
          <FootnoteText className="text-text-tertiary">
            {t('staking.networkFee', { count: shards.value.length || 1 })}
          </FootnoteText>
        }
        className="text-text-primary"
      >
        {isFeeLoading ? (
          <FeeLoader fiatFlag={Boolean(fiatFlag)} />
        ) : (
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={feeData.fee} asset={network.asset} />
            <AssetFiatBalance asset={network.asset} amount={feeData.fee} />
          </div>
        )}
      </DetailRow>

      {shards.value.length > 1 && (
        <DetailRow
          label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
          className="text-text-primary"
        >
          {isFeeLoading ? (
            <FeeLoader fiatFlag={Boolean(fiatFlag)} />
          ) : (
            <div className="flex flex-col items-end gap-y-0.5">
              <AssetBalance value={feeData.totalFee} asset={network.asset} />
              <AssetFiatBalance asset={network.asset} amount={feeData.totalFee} />
            </div>
          )}
        </DetailRow>
      )}
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModelShards.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
