import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useState } from 'react';

import { type Address, RewardsDestination } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress, validateAddress } from '@/shared/lib/utils';
import {
  Button,
  Combobox,
  DetailRow,
  FootnoteText,
  Icon,
  Identicon,
  InputHint,
  MultiSelect,
  RadioGroup,
  Tooltip,
} from '@/shared/ui';
import { type RadioOption } from '@/shared/ui/types';
import { AssetBalance } from '@/entities/asset';
import { SignatorySelector } from '@/entities/operations';
import { AssetFiatBalance, priceProviderModel } from '@/entities/price';
import { FeeLoader } from '@/entities/transaction';
import { AccountAddress, ProxyWalletAlert, accountUtils } from '@/entities/wallet';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const PayeeForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$payeeForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <AccountsSelector />
        <Signatories />
        <Destination />
      </form>
      <div className="flex flex-col gap-y-6 pb-4 pt-6">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { shards },
  } = useForm(formModel.$payeeForm);

  const feeData = useUnit(formModel.$feeData);
  const balance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

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
  } = useForm(formModel.$payeeForm);

  const accounts = useUnit(formModel.$accounts);
  const network = useUnit(formModel.$networkStore);

  if (!network || accounts.length <= 1) {
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

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$payeeForm);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig || !network) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories[0]}
      asset={network.chain.assets[0]}
      addressPrefix={network.chain.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const Destination = () => {
  const { t } = useI18n();

  const {
    fields: { destination },
  } = useForm(formModel.$payeeForm);

  const network = useUnit(formModel.$networkStore);
  const destinationAccounts = useUnit(formModel.$destinationAccounts);
  const destinationQuery = useUnit(formModel.$destinationQuery);

  const [payout, setPayout] = useState<Address>('');
  const [activeOptionId, setActiveOptionId] = useState<string>('0');

  if (!network) {
    return null;
  }

  const options: RadioOption<{ type: RewardsDestination; value: Address }>[] = [
    { title: t('staking.bond.restakeRewards'), value: '', rewardType: RewardsDestination.RESTAKE },
    { title: t('staking.bond.transferableRewards'), value: payout, rewardType: RewardsDestination.TRANSFERABLE },
  ].map((dest, index) => ({
    id: index.toString(),
    value: { type: dest.rewardType, value: dest.value },
    title: dest.title,
  }));

  const destinationOptions = destinationAccounts.map((account) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: address,
      element: (
        <div className="flex w-full justify-between" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 20) : account.name}
            canCopy={false}
          />
        </div>
      ),
    };
  });

  const prefixElement = (
    <div className="flex h-auto items-center">
      {validateAddress(payout) ? (
        <Identicon address={payout} size={20} background={false} canCopy={false} />
      ) : (
        <Icon size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  return (
    <RadioGroup
      label={t('staking.bond.rewardsDestinationLabel')}
      className="col-span-2"
      activeId={activeOptionId}
      options={options}
      onChange={(option) => {
        setActiveOptionId(option.id);
        destination.onChange(option.value.value);
        formModel.events.destinationTypeChanged(option.value.type);
      }}
    >
      <RadioGroup.Option option={options[0]} />
      <RadioGroup.Option option={options[1]}>
        <div className="flex flex-col gap-y-2">
          <Combobox
            placeholder={t('staking.bond.payoutAccountPlaceholder')}
            query={destinationQuery}
            value={payout}
            options={destinationOptions}
            invalid={destination.hasError()}
            prefixElement={prefixElement}
            onInput={formModel.events.destinationQueryChanged}
            onChange={({ value }) => {
              setPayout(value);
              destination.onChange(value);
            }}
          />

          <InputHint active={destination.hasError()} variant="error">
            {t('staking.bond.incorrectAddressError')}
          </InputHint>
        </div>
      </RadioGroup.Option>
    </RadioGroup>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(formModel.$payeeForm);

  const network = useUnit(formModel.$networkStore);
  const feeData = useUnit(formModel.$feeData);
  const isFeeLoading = useUnit(formModel.$isFeeLoading);
  const isMultisig = useUnit(formModel.$isMultisig);

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
              <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
                <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
              </Tooltip>
            </>
          }
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={feeData.multisigDeposit} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.multisigDeposit} />
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
            <AssetBalance value={feeData.fee} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.fee} />
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
              <AssetBalance value={feeData.totalFee} asset={network.chain.assets[0]} />
              <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.totalFee} />
            </div>
          )}
        </DetailRow>
      )}
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

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
